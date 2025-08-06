import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      checks: {
        database: { status: 'unknown', message: '' },
        finaleApi: { status: 'unknown', message: '' },
        syncProcess: { status: 'unknown', message: '' },
        dataIntegrity: { status: 'unknown', message: '' }
      },
      warnings: [] as string[],
      errors: [] as string[]
    }
    
    // Check database connectivity
    try {
      const { error } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      healthCheck.checks.database = { status: 'healthy', message: 'Database connection OK' }
    } catch (error) {
      healthCheck.checks.database = { 
        status: 'unhealthy', 
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      healthCheck.errors.push('Database connection failed')
      healthCheck.status = 'unhealthy'
    }
    
    // Check Finale API connectivity
    try {
      const config = await getFinaleConfig()
      if (!config) {
        healthCheck.checks.finaleApi = { 
          status: 'unhealthy', 
          message: 'Finale API not configured' 
        }
        healthCheck.warnings.push('Finale API credentials missing')
      } else {
        const finaleApi = new FinaleApiService(config)
        const isConnected = await finaleApi.testConnection()
        
        if (isConnected) {
          healthCheck.checks.finaleApi = { 
            status: 'healthy', 
            message: 'Finale API connection OK' 
          }
        } else {
          healthCheck.checks.finaleApi = { 
            status: 'unhealthy', 
            message: 'Finale API connection failed' 
          }
          healthCheck.errors.push('Cannot connect to Finale API')
          healthCheck.status = 'unhealthy'
        }
      }
    } catch (error) {
      healthCheck.checks.finaleApi = { 
        status: 'unhealthy', 
        message: `Finale API error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      healthCheck.errors.push('Finale API check failed')
      healthCheck.status = 'unhealthy'
    }
    
    // Check sync process health
    try {
      // Check for stuck syncs (running for more than 30 minutes)
      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
      
      const { data: stuckSyncs } = await supabase
        .from('sync_logs')
        .select('id, synced_at')
        .eq('status', 'running')
        .lt('synced_at', thirtyMinutesAgo.toISOString())
        .limit(1)
      
      if (stuckSyncs && stuckSyncs.length > 0) {
        healthCheck.checks.syncProcess = { 
          status: 'degraded', 
          message: `Sync appears stuck (running for over 30 minutes)` 
        }
        healthCheck.warnings.push('Sync process may be stuck')
        if (healthCheck.status === 'healthy') healthCheck.status = 'degraded'
      } else {
        // Check last sync time
        const { data: lastSync } = await supabase
          .from('sync_logs')
          .select('synced_at, status')
          .eq('sync_type', 'finale_inventory')
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (!lastSync) {
          healthCheck.checks.syncProcess = { 
            status: 'degraded', 
            message: 'No sync history found' 
          }
          healthCheck.warnings.push('No sync has been performed yet')
        } else {
          const hoursSinceLastSync = (Date.now() - new Date(lastSync.synced_at).getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceLastSync > 24) {
            healthCheck.checks.syncProcess = { 
              status: 'degraded', 
              message: `Last sync was ${Math.round(hoursSinceLastSync)} hours ago` 
            }
            healthCheck.warnings.push('Sync may be overdue')
            if (healthCheck.status === 'healthy') healthCheck.status = 'degraded'
          } else {
            healthCheck.checks.syncProcess = { 
              status: 'healthy', 
              message: `Last sync: ${Math.round(hoursSinceLastSync * 10) / 10} hours ago` 
            }
          }
        }
      }
    } catch (error) {
      healthCheck.checks.syncProcess = { 
        status: 'unknown', 
        message: 'Could not check sync process health' 
      }
    }
    
    // Check data integrity
    try {
      // Check for items with missing required fields
      const { count: itemsWithIssues } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .or('sku.is.null,product_name.is.null,stock.lt.0')
      
      if (itemsWithIssues && itemsWithIssues > 0) {
        healthCheck.checks.dataIntegrity = { 
          status: 'degraded', 
          message: `${itemsWithIssues} items have data issues` 
        }
        healthCheck.warnings.push(`Found ${itemsWithIssues} inventory items with missing or invalid data`)
        if (healthCheck.status === 'healthy') healthCheck.status = 'degraded'
      } else {
        healthCheck.checks.dataIntegrity = { 
          status: 'healthy', 
          message: 'No data integrity issues found' 
        }
      }
    } catch (error) {
      healthCheck.checks.dataIntegrity = { 
        status: 'unknown', 
        message: 'Could not check data integrity' 
      }
    }
    
    // Overall health determination
    const allChecks = Object.values(healthCheck.checks)
    if (allChecks.every(c => c.status === 'healthy')) {
      healthCheck.status = 'healthy'
    } else if (allChecks.some(c => c.status === 'unhealthy')) {
      healthCheck.status = 'unhealthy'
    } else {
      healthCheck.status = 'degraded'
    }
    
    return NextResponse.json(healthCheck)
  } catch (error) {
    logError('Health check error:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}