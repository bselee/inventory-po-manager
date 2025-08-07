/**
 * API endpoint for rejecting purchase orders
 * PUT /api/purchase-orders/[id]/reject
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { rejected_by, reason, notes } = body
    
    // Validate rejection reason
    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }
    
    // Fetch the current PO
    const { data: currentPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !currentPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    
    // Check if already processed
    if (currentPO.status === 'sent' || currentPO.status === 'received') {
      return NextResponse.json(
        { error: 'Cannot reject a purchase order that has been sent or received' },
        { status: 400 }
      )
    }
    
    // Update the PO status to rejected/cancelled
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'cancelled',
        rejected_at: new Date().toISOString(),
        rejected_by: rejected_by || null,
        rejection_reason: reason,
        notes: notes ? `${currentPO.notes || ''}\n[REJECTED] ${reason}: ${notes}`.trim() : `${currentPO.notes || ''}\n[REJECTED] ${reason}`.trim()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error rejecting PO:', error)
      return NextResponse.json(
        { error: 'Failed to reject purchase order' },
        { status: 500 }
      )
    }
    
    // Log the rejection action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'po_rejected',
        entity_type: 'purchase_order',
        entity_id: id,
        user_id: rejected_by,
        details: {
          po_number: currentPO.po_number,
          vendor: currentPO.vendor_name,
          total_amount: currentPO.total_amount,
          reason,
          notes
        }
      })
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'Purchase order rejected successfully',
      purchase_order: data
    })
  } catch (error) {
    console.error('Error rejecting purchase order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject purchase order' },
      { status: 500 }
    )
  }
}