import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { startAutoSync, stopAutoSync, runAutoSync } from '@/app/lib/auto-sync-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET: Check auto-sync status
export async function GET() {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_frequency_minutes, last_sync_time')
      .single()
    
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    let nextSyncTime = null
    if (settings?.last_sync_time && settings?.sync_enabled) {
      const nextSync = new Date(settings.last_sync_time)
      nextSync.setMinutes(nextSync.getMinutes() + (settings.sync_frequency_minutes || 60))
      nextSyncTime = nextSync.toISOString()
    }
    
    return NextResponse.json({
      enabled: settings?.sync_enabled || false,
      frequencyMinutes: settings?.sync_frequency_minutes || 60,
      lastSyncTime: settings?.last_sync_time,
      nextSyncTime,
      lastSyncDetails: lastSync ? {
        status: lastSync.status,
        itemsProcessed: lastSync.items_processed,
        duration: lastSync.duration_ms,
        source: lastSync.metadata?.source || 'manual'
      } : null
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get auto-sync status' },
      { status: 500 }
    )
  }
}

// POST: Control auto-sync
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'start':
        await startAutoSync()
        return NextResponse.json({ message: 'Auto-sync started' })
        
      case 'stop':
        stopAutoSync()
        return NextResponse.json({ message: 'Auto-sync stopped' })
        
      case 'trigger':
        // Manually trigger auto-sync
        await runAutoSync()
        return NextResponse.json({ message: 'Auto-sync triggered' })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or trigger' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to control auto-sync' },
      { status: 500 }
    )
  }
}