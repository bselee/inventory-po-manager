import { NextRequest, NextResponse } from 'next/server'
import { FinaleSyncService, getFinaleConfig } from '@/app/lib/finale-sync-service'
import { redis } from '@/app/lib/redis-client'
import { logInfo, logError } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    logInfo('[Test Finale] Starting connection test')

    // Get configuration
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Finale API not configured',
        setup: {
          required: [
            'FINALE_API_KEY',
            'FINALE_API_SECRET',
            'FINALE_ACCOUNT_PATH (optional, defaults to buildasoilorganics)'
          ],
          optional: [
            'FINALE_INVENTORY_REPORT_URL',
            'FINALE_VENDORS_REPORT_URL'
          ]
        }
      }, { status: 400 })
    }

    // Initialize service
    const syncService = new FinaleSyncService(config)

    // Test connection
    const isConnected = await syncService.testConnection()

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Finale API',
        config: {
          hasApiKey: !!config.apiKey,
          hasApiSecret: !!config.apiSecret,
          accountPath: config.accountPath,
          hasInventoryReportUrl: !!config.inventoryReportUrl,
          hasVendorsReportUrl: !!config.vendorsReportUrl
        }
      }, { status: 500 })
    }

    // Check Redis connection
    let redisConnected = false
    let redisError = null
    try {
      await redis.set('test:connection', { timestamp: new Date().toISOString() }, 60)
      const testData = await redis.get('test:connection')
      redisConnected = !!testData
    } catch (error) {
      redisError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Check existing data in Redis
    let inventoryCount = 0
    let vendorCount = 0
    let lastSync = null

    if (redisConnected) {
      const inventoryData = await redis.get<any[]>('inventory:full')
      inventoryCount = inventoryData ? inventoryData.length : 0

      const vendorData = await redis.get<any[]>('vendors:full')
      vendorCount = vendorData ? vendorData.length : 0

      const metadata = await redis.get<any>('inventory:metadata')
      lastSync = metadata?.lastSync
    }

    return NextResponse.json({
      success: true,
      finale: {
        connected: true,
        accountPath: config.accountPath,
        hasInventoryReportUrl: !!config.inventoryReportUrl,
        hasVendorsReportUrl: !!config.vendorsReportUrl
      },
      redis: {
        connected: redisConnected,
        error: redisError,
        data: {
          inventoryItems: inventoryCount,
          vendors: vendorCount,
          lastSync
        }
      },
      message: 'Finale API connection successful',
      nextSteps: inventoryCount === 0 ? [
        'No data in cache yet',
        'Use POST /api/sync-finale/trigger to sync data',
        'Or wait for automatic sync via cron jobs'
      ] : [
        `Found ${inventoryCount} inventory items in cache`,
        `Found ${vendorCount} vendors in cache`,
        lastSync ? `Last sync: ${new Date(lastSync).toLocaleString()}` : 'No sync timestamp found'
      ]
    })

  } catch (error) {
    logError('[Test Finale] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    logInfo('[Test Finale] Running quick sync test')

    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Finale API not configured'
      }, { status: 400 })
    }

    const syncService = new FinaleSyncService(config)

    // Do a dry run with limited data
    const result = await syncService.syncInventory({
      dryRun: true,
      syncToSupabase: false,
      filterYear: new Date().getFullYear() // Only current year for test
    })

    return NextResponse.json({
      success: result.success,
      test: 'dry_run',
      itemsFound: result.itemsProcessed,
      errors: result.errors,
      duration: result.duration,
      message: result.success 
        ? `Found ${result.itemsProcessed} items for ${new Date().getFullYear()}`
        : 'Test failed'
    })

  } catch (error) {
    logError('[Test Finale] Sync test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}