/**
 * API endpoint for approving purchase orders
 * PUT /api/purchase-orders/[id]/approve
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
    const { approved_by, notes } = body
    
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
    
    // Check if already approved
    if (currentPO.status === 'approved' || currentPO.status === 'sent') {
      return NextResponse.json(
        { error: 'Purchase order is already approved or sent' },
        { status: 400 }
      )
    }
    
    // Update the PO status to approved
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approved_by || null,
        notes: notes ? `${currentPO.notes || ''}\n[APPROVED] ${notes}`.trim() : currentPO.notes
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error approving PO:', error)
      return NextResponse.json(
        { error: 'Failed to approve purchase order' },
        { status: 500 }
      )
    }
    
    // Log the approval action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'po_approved',
        entity_type: 'purchase_order',
        entity_id: id,
        user_id: approved_by,
        details: {
          po_number: currentPO.po_number,
          vendor: currentPO.vendor_name,
          total_amount: currentPO.total_amount,
          notes
        }
      })
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'Purchase order approved successfully',
      purchase_order: data
    })
  } catch (error) {
    console.error('Error approving purchase order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve purchase order' },
      { status: 500 }
    )
  }
}