// Sync schedule configuration endpoint
import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// Define the sync schedule
export const SYNC_SCHEDULE = {
  // Every 15 minutes: Critical items (low stock/out of stock)
  critical: {
    interval: 15, // minutes
    cron: '*/15 * * * *',
    description: 'Critical items (out of stock, below reorder point)',
    strategy: 'critical'
  },
  
  // Every hour: Inventory levels only
  inventory: {
    interval: 60, // minutes
    cron: '0 * * * *',
    description: 'Inventory quantities only (fast sync)',
    strategy: 'inventory'
  },
  
  // Every 6 hours: Smart sync (auto-decides based on last sync)
  smart: {
    interval: 360, // minutes
    cron: '0 */6 * * *',
    description: 'Smart sync (auto-selects strategy)',
    strategy: 'smart'
  },
  
  // Daily at 2 AM: Active products only
  daily: {
    interval: 1440, // minutes
    cron: '0 2 * * *',
    description: 'Active products with full details',
    strategy: 'active'
  },
  
  // Weekly on Sunday at 3 AM: Full sync
  weekly: {
    interval: 10080, // minutes
    cron: '0 3 * * 0',
    description: 'Full sync (all products)',
    strategy: 'full'
  }
}

// GET current schedule configuration
export async function GET() {
  try {
    // Get settings to see what's enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_frequency_minutes, sync_schedule')
      .maybeSingle()
    
    // Get last sync info for each strategy
    const syncStatus = {}
    for (const [key, schedule] of Object.entries(SYNC_SCHEDULE)) {
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('synced_at, status, items_processed')
        .eq('sync_type', 'finale_inventory')
        .eq('metadata->strategy', schedule.strategy)
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      syncStatus[key] = {
        ...schedule,
        lastSync: lastSync?.synced_at || null,
        lastStatus: lastSync?.status || 'never',
        itemsProcessed: lastSync?.items_processed || 0,
        nextSync: lastSync ? new Date(new Date(lastSync.synced_at).getTime() + schedule.interval * 60 * 1000).toISOString() : null
      }
    }
    
    return NextResponse.json({
      enabled: settings?.sync_enabled || false,
      currentInterval: settings?.sync_frequency_minutes || 60,
      schedules: syncStatus
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// POST to update schedule configuration
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { enabled, scheduleType } = body
    
    // Update settings
    const { error } = await supabase
      .from('settings')
      .update({
        sync_enabled: enabled,
        sync_schedule: scheduleType,
        sync_frequency_minutes: SYNC_SCHEDULE[scheduleType]?.interval || 60
      })
      .eq('id', 1)
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: `Sync schedule updated to: ${scheduleType}`,
      schedule: SYNC_SCHEDULE[scheduleType]
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}