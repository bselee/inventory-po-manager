// Critical items sync endpoint
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

    // Run critical items sync
    const result = await finaleApi.syncCriticalItems()
    
    return NextResponse.json(result)
  } catch (error) {
    logError('[Critical Sync] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

// GET endpoint to check critical items without syncing
export async function GET() {
  try {
    const { supabase } = await import('@/app/lib/supabase')
    
    // Get items that need attention
    const { data: outOfStock } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('stock', 0)
      .order('product_name')
    
    const { data: belowReorder } = await supabase
      .from('inventory_items')
      .select('*')
      .lt('stock', 'reorder_point')
      .gt('reorder_point', 0)
      .order('stock')
    
    return NextResponse.json({
      outOfStock: outOfStock || [],
      belowReorder: belowReorder || [],
      totalCritical: (outOfStock?.length || 0) + (belowReorder?.length || 0)
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}