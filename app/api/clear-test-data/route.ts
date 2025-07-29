import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE() {
  try {
    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })

    // Delete all inventory items
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete everything

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to clear inventory data',
        details: deleteError.message 
      }, { status: 500 })
    }

    // Get count after deletion
    const { count: afterCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Test data cleared successfully',
      itemsDeleted: beforeCount || 0,
      itemsRemaining: afterCount || 0
    })

  } catch (error) {
    console.error('Error clearing test data:', error)
    return NextResponse.json({ 
      error: 'Failed to clear test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}