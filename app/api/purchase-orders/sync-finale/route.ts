import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchaseOrderId, action } = body

    if (!purchaseOrderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Purchase order ID is required' 
      }, { status: 400 })
    }

    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured. Please update settings.' 
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)

    // Get purchase order from database
    // Note: Using vendor column directly until migration is complete
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          *,
          inventory_items (
            sku,
            product_name
          )
        )
      `)
      .eq('id', purchaseOrderId)
      .single()

    if (poError || !purchaseOrder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Purchase order not found' 
      }, { status: 404 })
    }

    // Perform the requested action
    switch (action) {
      case 'create':
        // Create purchase order in Finale
        const finaleOrder = await finaleApi.createPurchaseOrder({
          orderNumber: purchaseOrder.order_number || purchaseOrder.po_number,
          vendorName: purchaseOrder.vendor, // Using vendor column directly
          orderDate: purchaseOrder.created_at,
          expectedDate: purchaseOrder.expected_date || purchaseOrder.expected_delivery,
          status: 'draft',
          notes: purchaseOrder.notes,
          items: purchaseOrder.purchase_order_items.map((item: any) => ({
            productSku: item.inventory_items.sku,
            productId: item.inventory_item_id,
            quantity: item.quantity,
            unitCost: item.unit_cost,
            description: item.inventory_items.product_name
          }))
        })

        // Update local PO with Finale ID
        await supabase
          .from('purchase_orders')
          .update({ 
            finale_order_id: finaleOrder.orderId,
            finale_sync_status: 'synced',
            finale_last_sync: new Date().toISOString()
          })
          .eq('id', purchaseOrderId)

        return NextResponse.json({ 
          success: true, 
          message: 'Purchase order created in Finale',
          finaleOrderId: finaleOrder.orderId
        })

      case 'update':
        // Update existing purchase order in Finale
        if (!purchaseOrder.finale_order_id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Purchase order not yet synced to Finale' 
          }, { status: 400 })
        }

        await finaleApi.updatePurchaseOrderStatus(
          purchaseOrder.finale_order_id,
          purchaseOrder.status
        )

        await supabase
          .from('purchase_orders')
          .update({ 
            finale_last_sync: new Date().toISOString()
          })
          .eq('id', purchaseOrderId)

        return NextResponse.json({ 
          success: true, 
          message: 'Purchase order updated in Finale'
        })

      case 'status':
        // Get status from Finale
        if (!purchaseOrder.finale_order_id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Purchase order not yet synced to Finale' 
          }, { status: 400 })
        }

        const finaleStatus = await finaleApi.getPurchaseOrder(purchaseOrder.finale_order_id)

        return NextResponse.json({ 
          success: true, 
          status: finaleStatus.status,
          finaleData: finaleStatus
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: create, update, or status' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('PO sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}

// GET endpoint to check sync status for all POs
export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        configured: false,
        message: 'Finale API not configured' 
      })
    }

    // Get all POs with sync status
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, order_number, finale_order_id, finale_sync_status, finale_last_sync')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      configured: true,
      purchaseOrders: purchaseOrders || []
    })
  } catch (error) {
    return NextResponse.json({ 
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}