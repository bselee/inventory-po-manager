import { NextRequest, NextResponse } from 'next/server'
import { 
  executeEnhancedSync, 
  executeIntelligentEnhancedSync, 
  checkEnhancedSyncHealth,
  initializeEnhancedSync,
  EnhancedSyncOptions 
} from '@/app/lib/enhanced-sync-service'

/**
 * Enhanced Sync API Endpoint
 * POST /api/sync/enhanced - Execute enhanced sync with optimizations
 * GET /api/sync/enhanced - Get enhanced sync status/health
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      action = 'sync',
      strategy = 'smart',
      enableChangeDetection = true,
      enableRealTimeMonitoring = true,
      enableIntelligentScheduling = false,
      forceSync = false,
      dryRun = false
    } = body
    switch (action) {
      case 'sync':
        const options: EnhancedSyncOptions = {
          strategy,
          enableChangeDetection,
          enableRealTimeMonitoring,
          enableIntelligentScheduling,
          forceSync,
          dryRun
        }

        const result = await executeEnhancedSync(options)
        
        return NextResponse.json({
          success: true,
          message: `Enhanced ${strategy} sync completed`,
          data: result,
          timestamp: new Date().toISOString()
        })

      case 'intelligent':
        const intelligentResult = await executeIntelligentEnhancedSync()
        
        return NextResponse.json({
          success: true,
          message: 'Intelligent enhanced sync completed',
          data: intelligentResult,
          timestamp: new Date().toISOString()
        })

      case 'initialize':
        await initializeEnhancedSync()
        
        return NextResponse.json({
          success: true,
          message: 'Enhanced sync system initialized',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action. Use: sync, intelligent, or initialize',
            validActions: ['sync', 'intelligent', 'initialize']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    logError('[API] Enhanced sync error:', error)
    
    return NextResponse.json(
      {
        error: 'Enhanced sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'

    switch (action) {
      case 'health':
        const health = await checkEnhancedSyncHealth()
        
        return NextResponse.json({
          success: true,
          data: health,
          timestamp: new Date().toISOString()
        })

      case 'status':
        // Get recent sync history
        const { supabase } = await import('@/app/lib/supabase')
        
        const { data: recentSyncs, error } = await supabase
          .from('sync_logs')
          .select('*')
          .in('sync_type', ['finale_inventory_enhanced', 'finale_inventory'])
          .order('synced_at', { ascending: false })
          .limit(10)

        if (error) {
          throw new Error(`Failed to fetch sync history: ${error.message}`)
        }

        // Get critical alerts
        const { count: criticalAlerts } = await supabase
          .from('inventory_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('severity', 'critical')
          .eq('acknowledged', false)

        const enhancedSyncs = recentSyncs?.filter(sync => 
          sync.sync_type === 'finale_inventory_enhanced'
        ) || []

        const standardSyncs = recentSyncs?.filter(sync => 
          sync.sync_type === 'finale_inventory'
        ) || []

        return NextResponse.json({
          success: true,
          data: {
            recentSyncs: {
              enhanced: enhancedSyncs,
              standard: standardSyncs,
              total: recentSyncs?.length || 0
            },
            criticalAlerts: criticalAlerts || 0,
            lastEnhancedSync: enhancedSyncs[0] || null,
            syncFrequency: {
              enhanced: enhancedSyncs.length,
              standard: standardSyncs.length
            }
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action. Use: health or status',
            validActions: ['health', 'status']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    logError('[API] Enhanced sync status error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to get enhanced sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
