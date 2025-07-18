import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// GET sync settings
export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Get last sync times from sync_logs
    const { data: lastSyncs } = await supabase
      .from('sync_logs')
      .select('sync_type, synced_at')
      .in('sync_type', ['inventory', 'vendors', 'purchase_orders'])
      .eq('status', 'success')
      .order('synced_at', { ascending: false })

    // Create a map of last sync times
    const syncTimes: Record<string, string> = {}
    lastSyncs?.forEach(log => {
      if (!syncTimes[log.sync_type]) {
        syncTimes[log.sync_type] = log.synced_at
      }
    })

    return NextResponse.json({
      sync_enabled: settings?.sync_enabled ?? true,
      sync_inventory: settings?.sync_inventory ?? true,
      sync_vendors: settings?.sync_vendors ?? true,
      sync_purchase_orders: settings?.sync_purchase_orders ?? true,
      sync_schedule: settings?.sync_schedule ?? 'daily',
      sync_time: settings?.sync_time ?? '02:00',
      last_inventory_sync: syncTimes.inventory,
      last_vendor_sync: syncTimes.vendors,
      last_po_sync: syncTimes.purchase_orders
    })
  } catch (error) {
    console.error('Error fetching sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync settings' },
      { status: 500 }
    )
  }
}

// PUT update sync settings
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        sync_enabled: body.sync_enabled,
        sync_inventory: body.sync_inventory,
        sync_vendors: body.sync_vendors,
        sync_purchase_orders: body.sync_purchase_orders,
        sync_schedule: body.sync_schedule,
        sync_time: body.sync_time,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    )
  }
}