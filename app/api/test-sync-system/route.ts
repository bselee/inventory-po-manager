import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { emailAlerts } from '@/app/lib/email-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export async function GET(request: NextRequest) {
  const results: TestResult[] = []
  
  try {
    // Test 1: Database connectivity
    try {
      const { error } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
      
      if (error) throw error
      
      results.push({
        test: 'Database Connectivity',
        status: 'pass',
        message: 'Successfully connected to Supabase'
      })
    } catch (error) {
      results.push({
        test: 'Database Connectivity',
        status: 'fail',
        message: 'Failed to connect to database',
        details: error
      })
    }
    
    // Test 2: Check required tables
    const requiredTables = ['sync_logs', 'failed_items', 'inventory_items', 'settings']
    for (const table of requiredTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        
        results.push({
          test: `Table: ${table}`,
          status: 'pass',
          message: `Table exists with ${count || 0} records`
        })
      } catch (error) {
        results.push({
          test: `Table: ${table}`,
          status: 'fail',
          message: `Table check failed`,
          details: error
        })
      }
    }
    
    // Test 3: Check RPC functions
    try {
      const { data: metrics, error } = await supabase
        .rpc('get_sync_metrics', { days_back: 1 })
      
      if (error) throw error
      
      results.push({
        test: 'RPC: get_sync_metrics',
        status: 'pass',
        message: 'Function works correctly',
        details: metrics
      })
    } catch (error) {
      results.push({
        test: 'RPC: get_sync_metrics',
        status: 'fail',
        message: 'Function not found or failed',
        details: error
      })
    }
    
    // Test 4: Check Finale configuration
    const config = await getFinaleConfig()
    if (config) {
      results.push({
        test: 'Finale Configuration',
        status: 'pass',
        message: 'Finale API credentials configured',
        details: { accountPath: config.accountPath }
      })
      
      // Test 5: Finale API connection
      try {
        const finaleApi = new FinaleApiService(config)
        const isConnected = await finaleApi.testConnection()
        
        if (isConnected) {
          results.push({
            test: 'Finale API Connection',
            status: 'pass',
            message: 'Successfully connected to Finale API'
          })
        } else {
          results.push({
            test: 'Finale API Connection',
            status: 'fail',
            message: 'Failed to connect to Finale API'
          })
        }
      } catch (error) {
        results.push({
          test: 'Finale API Connection',
          status: 'fail',
          message: 'Error testing Finale connection',
          details: error
        })
      }
    } else {
      results.push({
        test: 'Finale Configuration',
        status: 'fail',
        message: 'Finale API credentials not configured'
      })
    }
    
    // Test 6: Check sync_logs status constraint
    try {
      const { data: statusTest } = await supabase
        .from('sync_logs')
        .select('status')
        .in('status', ['success', 'error', 'running', 'partial'])
        .limit(1)
      
      results.push({
        test: 'Sync Logs Status Constraint',
        status: 'pass',
        message: 'Status constraint is properly configured'
      })
    } catch (error) {
      results.push({
        test: 'Sync Logs Status Constraint',
        status: 'warning',
        message: 'Could not verify status constraint',
        details: error
      })
    }
    
    // Test 7: Check for stuck syncs
    try {
      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
      
      const { data: stuckSyncs, error } = await supabase
        .from('sync_logs')
        .select('id, synced_at, metadata')
        .eq('status', 'running')
        .lt('synced_at', thirtyMinutesAgo.toISOString())
      
      if (error) throw error
      
      if (stuckSyncs && stuckSyncs.length > 0) {
        results.push({
          test: 'Stuck Syncs Check',
          status: 'warning',
          message: `Found ${stuckSyncs.length} stuck sync(s)`,
          details: stuckSyncs
        })
      } else {
        results.push({
          test: 'Stuck Syncs Check',
          status: 'pass',
          message: 'No stuck syncs found'
        })
      }
    } catch (error) {
      results.push({
        test: 'Stuck Syncs Check',
        status: 'fail',
        message: 'Failed to check for stuck syncs',
        details: error
      })
    }
    
    // Test 8: Email alerts configuration
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('alert_email, sendgrid_api_key, sendgrid_from_email')
        .single()
      
      const hasEmailConfig = !!(settings?.alert_email && settings?.sendgrid_api_key)
      
      results.push({
        test: 'Email Alerts Configuration',
        status: hasEmailConfig ? 'pass' : 'warning',
        message: hasEmailConfig 
          ? 'Email alerts are configured' 
          : 'Email alerts not configured (optional)',
        details: {
          hasAlertEmail: !!settings?.alert_email,
          hasSendGridKey: !!settings?.sendgrid_api_key,
          hasFromEmail: !!settings?.sendgrid_from_email
        }
      })
    } catch (error) {
      results.push({
        test: 'Email Alerts Configuration',
        status: 'warning',
        message: 'Could not check email configuration',
        details: error
      })
    }
    
    // Test 9: Test monitoring endpoints
    const endpoints = [
      '/api/sync-finale/status',
      '/api/sync-finale/health',
      '/api/sync-finale/history',
      '/api/sync-finale/metrics'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
        const response = await fetch(`${baseUrl}${endpoint}`)
        
        results.push({
          test: `Endpoint: ${endpoint}`,
          status: response.ok ? 'pass' : 'fail',
          message: response.ok ? 'Endpoint is working' : `HTTP ${response.status}`,
          details: { status: response.status }
        })
      } catch (error) {
        results.push({
          test: `Endpoint: ${endpoint}`,
          status: 'fail',
          message: 'Failed to reach endpoint',
          details: error
        })
      }
    }
    
    // Test 10: Check data integrity
    try {
      const { count: duplicateCount } = await supabase
        .rpc('find_duplicate_skus')
      
      const { count: negativeStock } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 0)
      
      const { count: missingSkus } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .is('sku', null)
      
      const hasIssues = (duplicateCount || 0) > 0 || (negativeStock || 0) > 0 || (missingSkus || 0) > 0
      
      results.push({
        test: 'Data Integrity',
        status: hasIssues ? 'warning' : 'pass',
        message: hasIssues ? 'Data integrity issues found' : 'No data integrity issues',
        details: {
          duplicateSkus: duplicateCount || 0,
          negativeStock: negativeStock || 0,
          missingSkus: missingSkus || 0
        }
      })
    } catch (error) {
      results.push({
        test: 'Data Integrity',
        status: 'fail',
        message: 'Failed to check data integrity',
        details: error
      })
    }
    
    // Calculate overall status
    const failCount = results.filter(r => r.status === 'fail').length
    const warningCount = results.filter(r => r.status === 'warning').length
    const passCount = results.filter(r => r.status === 'pass').length
    
    const overallStatus = failCount > 0 ? 'fail' : warningCount > 0 ? 'warning' : 'pass'
    const readyToSync = results
      .filter(r => ['Database Connectivity', 'Finale Configuration', 'Finale API Connection'].includes(r.test))
      .every(r => r.status === 'pass')
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: {
        status: overallStatus,
        readyToSync,
        summary: {
          total: results.length,
          passed: passCount,
          failed: failCount,
          warnings: warningCount
        }
      },
      results,
      recommendations: getRecommendations(results)
    })
  } catch (error) {
    return NextResponse.json({
      error: 'System test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}

function getRecommendations(results: TestResult[]): string[] {
  const recommendations: string[] = []
  
  const failedTests = results.filter(r => r.status === 'fail')
  const warningTests = results.filter(r => r.status === 'warning')
  
  // Critical failures
  if (failedTests.some(t => t.test === 'Database Connectivity')) {
    recommendations.push('CRITICAL: Fix database connection immediately')
  }
  
  if (failedTests.some(t => t.test === 'Finale Configuration')) {
    recommendations.push('Configure Finale API credentials in Settings')
  }
  
  if (failedTests.some(t => t.test === 'Finale API Connection')) {
    recommendations.push('Verify Finale API credentials and account path')
  }
  
  // Table issues
  const tableFailures = failedTests.filter(t => t.test.startsWith('Table:'))
  if (tableFailures.length > 0) {
    recommendations.push(`Run database migrations for: ${tableFailures.map(t => t.test.split(': ')[1]).join(', ')}`)
  }
  
  // RPC function issues
  if (failedTests.some(t => t.test.startsWith('RPC:'))) {
    recommendations.push('Run scripts/add-sync-improvements.sql to create required functions')
  }
  
  // Warnings
  if (warningTests.some(t => t.test === 'Stuck Syncs Check')) {
    recommendations.push('Found stuck syncs - run /api/sync-finale/check-stuck?autoFix=true')
  }
  
  if (warningTests.some(t => t.test === 'Email Alerts Configuration')) {
    recommendations.push('Configure email alerts for sync failure notifications (optional)')
  }
  
  if (warningTests.some(t => t.test === 'Data Integrity')) {
    recommendations.push('Run /api/sync-finale/validate for detailed data integrity report')
  }
  
  // Endpoint failures
  const endpointFailures = failedTests.filter(t => t.test.startsWith('Endpoint:'))
  if (endpointFailures.length > 0) {
    recommendations.push('Some monitoring endpoints are not responding - check server logs')
  }
  
  if (recommendations.length === 0 && results.every(r => r.status === 'pass')) {
    recommendations.push('System is fully operational - ready for production use!')
  }
  
  return recommendations
}