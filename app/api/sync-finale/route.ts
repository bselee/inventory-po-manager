// app/api/sync-finale/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/lib/finale-api'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get dry run flag from request body
    const body = await request.json().catch(() => ({}))
    const { dryRun = false } = body

    // Get Finale API config from settings
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured. Please update settings.' 
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)

    // Test connection first
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials.' 
      }, { status: 500 })
    }

    // Perform sync
    const result = await finaleApi.syncToSupabase(dryRun)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync endpoint error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}

// GET endpoint to check sync status and last sync time
export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        configured: false,
        message: 'Finale API not configured' 
      })
    }

    // Get last sync info from most recently updated item
    const { data: lastSync } = await supabase
      .from('inventory_items')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      configured: true,
      lastSync: lastSync?.last_updated || null,
      accountPath: config.accountPath
    })
  } catch (error) {
    return NextResponse.json({ 
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}