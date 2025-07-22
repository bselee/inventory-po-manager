// Fast inventory-only sync endpoint
import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    const finaleApi = new FinaleApiService(config)
    
    // Test connection
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API' 
      }, { status: 500 })
    }

    // Run inventory-only sync
    const result = await finaleApi.syncInventoryOnly()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Inventory Sync] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}