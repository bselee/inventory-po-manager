import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if vendor sync is enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_vendors')
      .single()

    if (!settings?.sync_enabled || !settings?.sync_vendors) {
      return NextResponse.json({ 
        message: 'Vendor sync is disabled',
        sync_enabled: settings?.sync_enabled,
        sync_vendors: settings?.sync_vendors
      })
    }

    // Call the sync endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/sync-vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual: false })
    })

    const result = await response.json()

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Synced ${result.processed || 0} vendors`
        : `Sync failed: ${result.error}`,
      details: result
    })

  } catch (error) {
    console.error('Cron vendor sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}