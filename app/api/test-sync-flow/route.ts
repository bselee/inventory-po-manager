import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      steps: [] as any[],
      overall: 'pending' as 'success' | 'partial' | 'failed'
    }
    
    // Step 1: Check database connection
    testResults.steps.push({
      step: 'Database Connection',
      status: 'testing'
    })
    
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('id, sync_enabled')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      
      testResults.steps[0] = {
        step: 'Database Connection',
        status: 'success',
        message: 'Connected to Supabase',
        details: { hasSettings: !!settings, syncEnabled: settings?.sync_enabled }
      }
    } catch (error) {
      testResults.steps[0] = {
        step: 'Database Connection',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.overall = 'failed'
      return NextResponse.json(testResults)
    }
    
    // Step 2: Check Finale configuration
    testResults.steps.push({
      step: 'Finale Configuration',
      status: 'testing'
    })
    
    const config = await getFinaleConfig()
    if (!config) {
      testResults.steps[1] = {
        step: 'Finale Configuration',
        status: 'failed',
        error: 'Finale API credentials not configured in settings'
      }
      testResults.overall = 'failed'
      return NextResponse.json(testResults)
    }
    
    testResults.steps[1] = {
      step: 'Finale Configuration',
      status: 'success',
      message: 'Configuration loaded',
      details: { accountPath: config.accountPath }
    }
    
    // Step 3: Test Finale connection
    testResults.steps.push({
      step: 'Finale API Connection',
      status: 'testing'
    })
    
    const finaleApi = new FinaleApiService(config)
    const isConnected = await finaleApi.testConnection()
    
    if (!isConnected) {
      testResults.steps[2] = {
        step: 'Finale API Connection',
        status: 'failed',
        error: 'Cannot connect to Finale API'
      }
      testResults.overall = 'failed'
      return NextResponse.json(testResults)
    }
    
    testResults.steps[2] = {
      step: 'Finale API Connection',
      status: 'success',
      message: 'Connected to Finale API'
    }
    
    // Step 4: Test data fetch (small sample)
    testResults.steps.push({
      step: 'Fetch Sample Data',
      status: 'testing'
    })
    
    try {
      // Fetch just current year data as a test
      const products = await finaleApi.getInventoryData(new Date().getFullYear())
      const sampleSize = Math.min(5, products.length)
      
      testResults.steps[3] = {
        step: 'Fetch Sample Data',
        status: 'success',
        message: `Fetched ${products.length} products from Finale`,
        details: {
          totalProducts: products.length,
          sample: products.slice(0, sampleSize).map(p => ({
            sku: p.productSku,
            name: p.productName,
            stock: p.quantityOnHand
          }))
        }
      }
    } catch (error) {
      testResults.steps[3] = {
        step: 'Fetch Sample Data',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.overall = 'partial'
    }
    
    // Step 5: Test sync process (dry run)
    testResults.steps.push({
      step: 'Test Sync Process',
      status: 'testing'
    })
    
    try {
      const dryRunResult = await finaleApi.syncToSupabase(true, new Date().getFullYear())
      
      testResults.steps[4] = {
        step: 'Test Sync Process',
        status: 'success',
        message: 'Dry run completed successfully',
        details: {
          totalProducts: dryRunResult.totalProducts,
          wouldProcess: dryRunResult.totalProducts,
          sample: dryRunResult.sample?.slice(0, 3)
        }
      }
    } catch (error) {
      testResults.steps[4] = {
        step: 'Test Sync Process',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.overall = 'partial'
    }
    
    // Step 6: Check monitoring endpoints
    testResults.steps.push({
      step: 'Monitoring Endpoints',
      status: 'testing'
    })
    
    try {
      const endpoints = [
        '/api/sync-finale/status',
        '/api/sync-finale/health',
        '/api/sync-finale/history?limit=1',
        '/api/sync-finale/metrics?days=1'
      ]
      
      const endpointResults = []
      for (const endpoint of endpoints) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
          const response = await fetch(`${baseUrl}${endpoint}`)
          endpointResults.push({
            endpoint,
            status: response.status,
            ok: response.ok
          })
        } catch (error) {
          endpointResults.push({
            endpoint,
            error: 'Failed to fetch'
          })
        }
      }
      
      const allOk = endpointResults.every(r => r.ok || r.status === 200)
      
      testResults.steps[5] = {
        step: 'Monitoring Endpoints',
        status: allOk ? 'success' : 'warning',
        message: allOk ? 'All endpoints responding' : 'Some endpoints not responding',
        details: endpointResults
      }
    } catch (error) {
      testResults.steps[5] = {
        step: 'Monitoring Endpoints',
        status: 'warning',
        error: 'Could not test all endpoints'
      }
    }
    
    // Determine overall status
    const failedSteps = testResults.steps.filter(s => s.status === 'failed').length
    const warningSteps = testResults.steps.filter(s => s.status === 'warning').length
    
    if (failedSteps === 0 && warningSteps === 0) {
      testResults.overall = 'success'
    } else if (failedSteps === 0) {
      testResults.overall = 'partial'
    } else {
      testResults.overall = 'failed'
    }
    
    // Add recommendations
    const recommendations = []
    
    if (testResults.steps[0].status === 'failed') {
      recommendations.push('Fix database connection issues first')
    }
    if (testResults.steps[1].status === 'failed') {
      recommendations.push('Configure Finale API credentials in settings')
    }
    if (testResults.steps[2].status === 'failed') {
      recommendations.push('Verify Finale API credentials and account path')
    }
    if (testResults.steps[3].status === 'failed') {
      recommendations.push('Check Finale API permissions and data access')
    }
    
    return NextResponse.json({
      ...testResults,
      summary: {
        canSync: testResults.steps.slice(0, 4).every(s => s.status === 'success'),
        recommendations
      }
    })
  } catch (error) {
    console.error('Test sync flow error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}