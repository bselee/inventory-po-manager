import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Validation schema
const generatePOSchema = z.object({
  type: z.enum(['critical', 'out_of_stock', 'reorder_point', 'manual']),
  vendorId: z.string().optional(),
  items: z.array(z.object({
    inventoryItemId: z.string(),
    quantity: z.number().positive()
  })).optional()
});

// POST /api/purchase-orders/generate - Generate PO from inventory needs
export const POST = createApiHandler(async ({ body }) => {
  const validatedData = generatePOSchema.parse(body);
  
  let itemsToOrder = [];
  
  // Fetch items based on generation type
  switch (validatedData.type) {
    case 'critical':
      // Get items with critical stock levels (≤7 days)
      const { data: criticalItems } = await supabase
        .from('items_needing_reorder')
        .select('*')
        .eq('urgency_level', 'critical');
      
      itemsToOrder = criticalItems || [];
      break;
      
    case 'out_of_stock':
      // Get items with zero or negative stock
      const { data: outOfStockItems } = await supabase
        .from('inventory_items')
        .select('*')
        .lte('current_stock', 0)
        .eq('active', true)
        .eq('discontinued', false);
      
      itemsToOrder = outOfStockItems || [];
      break;
      
    case 'reorder_point':
      // Get items below reorder point
      const { data: reorderItems } = await supabase
        .from('items_needing_reorder')
        .select('*');
      
      itemsToOrder = reorderItems || [];
      break;
      
    case 'manual':
      // Use provided items
      if (!validatedData.items || validatedData.items.length === 0) {
        return apiError('Items are required for manual PO generation', 400);
      }
      
      const itemIds = validatedData.items.map(item => item.inventoryItemId);
      const { data: manualItems } = await supabase
        .from('inventory_items')
        .select('*')
        .in('id', itemIds);
      
      itemsToOrder = manualItems || [];
      break;
  }
  
  if (itemsToOrder.length === 0) {
    return apiResponse({
      message: 'No items need ordering at this time',
      purchaseOrders: []
    });
  }
  
  // Group items by vendor
  const itemsByVendor = itemsToOrder.reduce((acc, item) => {
    const vendorId = item.vendor_id || 'unknown';
    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendor: item.vendor_name || 'Unknown Vendor',
        vendor_id: vendorId,
        vendor_email: '', // Will be fetched
        items: []
      };
    }
    
    // Calculate suggested order quantity
    const suggestedQuantity = Math.max(
      item.suggested_order_quantity || 0,
      item.reorder_quantity || 0,
      item.min_order_quantity || 1,
      Math.ceil((item.sales_velocity_30d || 0) * (item.lead_time_days || 7) * 1.5)
    );
    
    // Ensure quantity is multiple of order_increment
    const orderIncrement = item.order_increment || 1;
    const finalQuantity = Math.ceil(suggestedQuantity / orderIncrement) * orderIncrement;
    
    acc[vendorId].items.push({
      productId: item.id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: finalQuantity,
      unit_cost: item.cost || 0,
      current_stock: item.current_stock,
      sales_velocity: item.sales_velocity_30d,
      days_until_stockout: item.days_until_stockout,
      urgency_level: item.urgency_level
    });
    
    return acc;
  }, {} as Record<string, any>);
  
  // Fetch vendor details
  const vendorIds = Object.keys(itemsByVendor).filter(id => id !== 'unknown');
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds);
    
    if (vendors) {
      vendors.forEach(vendor => {
        if (itemsByVendor[vendor.id]) {
          itemsByVendor[vendor.id].vendor_email = vendor.email || '';
          itemsByVendor[vendor.id].vendor_contact = vendor.contact_name || '';
          itemsByVendor[vendor.id].vendor_phone = vendor.phone || '';
        }
      });
    }
  }
  
  // Create purchase orders
  const createdPOs = [];
  
  for (const [vendorId, vendorData] of Object.entries(itemsByVendor)) {
    // Filter by specific vendor if requested
    if (validatedData.vendorId && vendorId !== validatedData.vendorId) {
      continue;
    }
    
    // Calculate totals
    const subtotal = vendorData.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unit_cost), 0
    );
    
    // Generate PO number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const orderNumber = `PO-${year}-${timestamp}`;
    
    // Determine urgency level
    const hasUrgentItems = vendorData.items.some((item: any) => 
      item.urgency_level === 'critical' || item.urgency_level === 'high'
    );
    const urgencyLevel = hasUrgentItems ? 
      (vendorData.items.some((item: any) => item.urgency_level === 'critical') ? 'critical' : 'high') 
      : 'medium';
    
    // Create PO
    const { data: newPO, error } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        vendor: vendorData.vendor,
        vendor_id: vendorId !== 'unknown' ? vendorId : null,
        vendor_email: vendorData.vendor_email,
        status: 'draft',
        items: vendorData.items,
        total_amount: subtotal,
        shipping_cost: 0,
        tax_amount: 0,
        urgency_level: urgencyLevel,
        auto_generated: true,
        created_by: 'system',
        notes: `Auto-generated PO for ${validatedData.type} items`,
        expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single();
    
    if (!error && newPO) {
      createdPOs.push(newPO);
      
      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          action: 'AUTO_GENERATE',
          entity_type: 'purchase_order',
          entity_id: newPO.id,
          user_id: 'system',
          details: {
            generation_type: validatedData.type,
            item_count: vendorData.items.length,
            urgency_level: urgencyLevel
          }
        });
    }
  }
  
  return apiResponse({
    message: `Generated ${createdPOs.length} purchase order(s)`,
    purchaseOrders: createdPOs,
    summary: {
      total_pos: createdPOs.length,
      total_items: createdPOs.reduce((sum, po) => sum + po.items.length, 0),
      total_value: createdPOs.reduce((sum, po) => sum + po.total_amount, 0)
    }
  });
}, {
  validateBody: generatePOSchema
});