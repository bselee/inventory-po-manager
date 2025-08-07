/**
 * API endpoint for creating custom purchase orders
 * POST /api/purchase-orders/create
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Validation schema for PO creation
const createPOSchema = z.object({
  vendor_id: z.string().optional(),
  vendor_name: z.string().min(1),
  vendor_email: z.string().email().optional(),
  items: z.array(z.object({
    sku: z.string().min(1),
    product_name: z.string().min(1),
    quantity: z.number().positive(),
    unit_cost: z.number().nonnegative(),
    notes: z.string().optional()
  })).min(1, 'At least one item is required'),
  shipping_cost: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    let validatedData
    try {
      validatedData = createPOSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            details: validationError.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      throw validationError
    }
    
    // Generate PO number
    const timestamp = Date.now().toString().slice(-6)
    const year = new Date().getFullYear()
    const poNumber = `PO-${year}-${timestamp}`
    
    // Calculate totals
    const itemsTotal = validatedData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_cost),
      0
    )
    const totalAmount = itemsTotal + 
      (validatedData.shipping_cost || 0) + 
      (validatedData.tax_amount || 0)
    
    // Prepare items with calculated totals
    const itemsWithTotals = validatedData.items.map(item => ({
      ...item,
      total_cost: item.quantity * item.unit_cost
    }))
    
    // Check if vendor exists and get/create vendor record
    let vendorId = validatedData.vendor_id
    if (!vendorId && validatedData.vendor_name) {
      // Try to find existing vendor by name
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('name', validatedData.vendor_name)
        .single()
      
      if (existingVendor) {
        vendorId = existingVendor.id
      } else {
        // Create new vendor
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendors')
          .insert({
            name: validatedData.vendor_name,
            contact_email: validatedData.vendor_email,
            active: true
          })
          .select('id')
          .single()
        
        if (!vendorError && newVendor) {
          vendorId = newVendor.id
        }
      }
    }
    
    // Create the purchase order
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        vendor_id: vendorId,
        vendor_name: validatedData.vendor_name,
        vendor_email: validatedData.vendor_email,
        status: 'draft',
        items: itemsWithTotals,
        total_amount: totalAmount,
        shipping_cost: validatedData.shipping_cost || 0,
        tax_amount: validatedData.tax_amount || 0,
        expected_date: validatedData.expected_date,
        notes: validatedData.notes,
        created_by: validatedData.created_by,
        order_date: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating purchase order:', error)
      return NextResponse.json(
        { error: 'Failed to create purchase order', details: error.message },
        { status: 500 }
      )
    }
    
    // Log the creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'po_created',
        entity_type: 'purchase_order',
        entity_id: data.id,
        user_id: validatedData.created_by,
        details: {
          po_number: poNumber,
          vendor: validatedData.vendor_name,
          total_amount: totalAmount,
          item_count: validatedData.items.length
        }
      })
    
    return NextResponse.json({
      success: true,
      message: 'Purchase order created successfully',
      purchase_order: data
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}