import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler';
import { z } from 'zod';
import { getFinaleConfig } from '@/app/lib/data-access';
import { FinaleApiService } from '@/app/lib/finale-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Validation schemas
const updatePOSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'approved', 'sent', 'partial', 'received', 'cancelled']).optional(),
  vendor: z.string().optional(),
  vendor_email: z.string().email().optional(),
  items: z.array(z.object({
    productId: z.string(),
    sku: z.string(),
    product_name: z.string(),
    quantity: z.number().positive(),
    unit_cost: z.number().nonnegative(),
    total_cost: z.number().optional()
  })).optional(),
  total_amount: z.number().nonnegative().optional(),
  shipping_cost: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  expected_date: z.string().optional()
});

// GET /api/purchase-orders/[id] - Get single PO with full details
export const GET = createApiHandler(async ({ params }) => {
  const id = params?.id;
  
  if (!id) {
    return apiError('Purchase order ID is required', 400);
  }

  // Fetch PO with audit logs
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (poError || !po) {
    return apiError('Purchase order not found', 404);
  }

  // Fetch audit logs for this PO
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'purchase_order')
    .eq('entity_id', id)
    .order('created_at', { ascending: false });

  // Fetch vendor details if available
  let vendor = null;
  if (po.vendor_id) {
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', po.vendor_id)
      .single();
    vendor = vendorData;
  }

  // Calculate timeline events
  const timeline = [];
  
  if (po.created_at) {
    timeline.push({
      date: po.created_at,
      event: 'Created',
      user: po.created_by || 'System',
      type: 'creation'
    });
  }
  
  if (po.approved_at) {
    timeline.push({
      date: po.approved_at,
      event: 'Approved',
      user: po.approved_by || 'System',
      type: 'approval'
    });
  }
  
  if (po.rejected_at) {
    timeline.push({
      date: po.rejected_at,
      event: 'Rejected',
      user: po.rejected_by || 'System',
      reason: po.rejection_reason,
      type: 'rejection'
    });
  }

  // Add audit log events to timeline
  if (auditLogs) {
    auditLogs.forEach(log => {
      timeline.push({
        date: log.created_at,
        event: log.action,
        user: log.user_id || 'System',
        details: log.details,
        type: 'audit'
      });
    });
  }

  // Sort timeline by date
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return apiResponse({
    purchaseOrder: po,
    vendor,
    timeline,
    auditLogs: auditLogs || []
  });
});

// PUT /api/purchase-orders/[id] - Update purchase order
export const PUT = createApiHandler(async ({ params, body }) => {
  const id = params?.id;
  
  if (!id) {
    return apiError('Purchase order ID is required', 400);
  }

  // Validate update data
  const validatedData = updatePOSchema.parse(body);

  // Fetch current PO
  const { data: currentPO, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentPO) {
    return apiError('Purchase order not found', 404);
  }

  // Calculate total if items are updated
  if (validatedData.items) {
    validatedData.total_amount = validatedData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_cost);
    }, 0) + (validatedData.shipping_cost || 0) + (validatedData.tax_amount || 0);
  }

  // Update PO
  const { data: updatedPO, error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return apiError('Failed to update purchase order', 500);
  }

  // Create audit log entry
  await supabase
    .from('audit_logs')
    .insert({
      action: 'UPDATE',
      entity_type: 'purchase_order',
      entity_id: id,
      user_id: 'system', // TODO: Get from auth context
      details: {
        changes: validatedData,
        previous_status: currentPO.status,
        new_status: validatedData.status || currentPO.status
      }
    });

  // If status changed to 'sent', sync with Finale
  if (validatedData.status === 'sent' && currentPO.status !== 'sent') {
    try {
      const finaleConfig = await getFinaleConfig();
      if (finaleConfig) {
        const finaleApi = new FinaleApiService(finaleConfig);
        await finaleApi.createPurchaseOrder(updatedPO);
      }
    } catch (error) {
      console.error('Failed to sync with Finale:', error);
      // Don't fail the update, just log the error
    }
  }

  return apiResponse({
    purchaseOrder: updatedPO,
    message: 'Purchase order updated successfully'
  });
}, {
  validateBody: updatePOSchema
});

// DELETE /api/purchase-orders/[id] - Delete/cancel purchase order
export const DELETE = createApiHandler(async ({ params }) => {
  const id = params?.id;
  
  if (!id) {
    return apiError('Purchase order ID is required', 400);
  }

  // Check if PO exists and can be deleted
  const { data: po, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !po) {
    return apiError('Purchase order not found', 404);
  }

  // Only allow deletion of draft POs
  if (po.status !== 'draft') {
    // For non-draft, update to cancelled
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return apiError('Failed to cancel purchase order', 500);
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: 'CANCEL',
        entity_type: 'purchase_order',
        entity_id: id,
        user_id: 'system',
        details: { previous_status: po.status }
      });

    return apiResponse({
      message: 'Purchase order cancelled successfully'
    });
  }

  // Delete draft PO
  const { error: deleteError } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return apiError('Failed to delete purchase order', 500);
  }

  // Create audit log
  await supabase
    .from('audit_logs')
    .insert({
      action: 'DELETE',
      entity_type: 'purchase_order',
      entity_id: id,
      user_id: 'system',
      details: { deleted_po: po }
    });

  return apiResponse({
    message: 'Purchase order deleted successfully'
  });
});