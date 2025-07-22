import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    // Get inventory items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(10)
    
    // Get inventory summary
    const { data: summary, error: summaryError } = await supabase
      .from('inventory_summary')
      .select('*')
      .single()
    
    return NextResponse.json({
      inventory: {
        count: items?.length || 0,
        items: items?.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.product_name,
          stock: item.stock,
          location: item.location,
          vendor: item.vendor,
          cost: item.cost
        })),
        error: itemsError?.message
      },
      summary: {
        data: summary,
        error: summaryError?.message
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get inventory data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}