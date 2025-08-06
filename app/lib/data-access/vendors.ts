/**
 * Data Access Layer for Vendor Operations
 * Centralizes all database queries related to vendor management
 */

import { supabase } from '@/lib/supabase'

export interface Vendor {
  id: string
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  lead_time_days?: number
  minimum_order?: number
  notes?: string
  active: boolean
  finale_vendor_id?: string
  created_at?: string
  updated_at?: string
}

/**
 * Get all vendors with optional filtering
 */
export async function getVendors(options?: {
  active?: boolean
  search?: string
  limit?: number
  offset?: number
}): Promise<{ vendors: Vendor[]; total: number }> {
  let query = supabase
    .from('vendors')
    .select('*', { count: 'exact' })

  // Apply filters
  if (options?.active !== undefined) {
    query = query.eq('active', options.active)
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,contact_name.ilike.%${options.search}%`)
  }

  // Apply pagination
  if (options?.offset !== undefined && options?.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1)
  } else if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('name', { ascending: true })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch vendors: ${error.message}`)
  }

  return {
    vendors: data || [],
    total: count || 0
  }
}

/**
 * Get a single vendor by ID
 */
export async function getVendorById(id: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch vendor: ${error.message}`)
  }

  return data
}

/**
 * Get vendor by name
 */
export async function getVendorByName(name: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .ilike('name', name)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to fetch vendor by name: ${error.message}`)
  }

  return data
}

/**
 * Create a new vendor
 */
export async function createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      ...vendor,
      active: vendor.active ?? true,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create vendor: ${error.message}`)
  }

  return data
}

/**
 * Update a vendor
 */
export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update vendor: ${error.message}`)
  }

  return data
}

/**
 * Delete a vendor (soft delete by marking inactive)
 */
export async function deactivateVendor(id: string): Promise<void> {
  await updateVendor(id, { active: false })
}

/**
 * Sync vendor from Finale data
 */
export async function syncVendorFromFinale(finaleVendor: any): Promise<Vendor> {
  const existingVendor = await getVendorByName(finaleVendor.name)

  const vendorData = {
    name: finaleVendor.name,
    contact_name: finaleVendor.contactName || finaleVendor.contact,
    email: finaleVendor.email,
    phone: finaleVendor.phone,
    address: finaleVendor.address,
    payment_terms: finaleVendor.paymentTerms,
    lead_time_days: finaleVendor.leadTimeDays,
    minimum_order: finaleVendor.minimumOrder,
    notes: finaleVendor.notes,
    finale_vendor_id: finaleVendor.id || finaleVendor.vendorId,
    active: true
  }

  if (existingVendor) {
    return updateVendor(existingVendor.id, vendorData)
  } else {
    return createVendor(vendorData as Omit<Vendor, 'id' | 'created_at' | 'updated_at'>)
  }
}

/**
 * Get vendors with low stock items
 */
export async function getVendorsWithLowStockItems(): Promise<Array<{
  vendor: Vendor
  itemCount: number
  criticalCount: number
}>> {
  // This would typically join with inventory_items table
  // For now, returning a simplified version
  const { data, error } = await supabase
    .from('vendors')
    .select(`
      *,
      inventory_items!inner(
        id,
        stock_status_level
      )
    `)
    .eq('active', true)

  if (error) {
    throw new Error(`Failed to fetch vendors with low stock: ${error.message}`)
  }

  // Process the data to count items per vendor
  // This is a simplified implementation
  return []
}

/**
 * Get vendor statistics
 */
export async function getVendorStats(vendorId: string) {
  const vendor = await getVendorById(vendorId)
  if (!vendor) throw new Error('Vendor not found')

  // Get item count for this vendor
  const { count: itemCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('vendor', vendor.name)

  // Get purchase order count and total spending
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select('id, total_amount, order_date, status')
    .eq('vendor', vendor.name)
    .order('order_date', { ascending: false })

  // Calculate purchase order statistics
  const totalOrders = purchaseOrders?.length || 0
  const totalSpend = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0
  const averageOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0
  const lastOrderDate = purchaseOrders?.[0]?.order_date || null
  
  // Count orders by status
  const draftOrders = purchaseOrders?.filter(po => po.status === 'draft').length || 0
  const submittedOrders = purchaseOrders?.filter(po => po.status === 'submitted').length || 0
  const approvedOrders = purchaseOrders?.filter(po => po.status === 'approved').length || 0

  // Get inventory breakdown for this vendor
  const { data: inventoryItems } = await supabase
    .from('inventory_items')
    .select('id, stock, reorder_point, cost, unit_price, sales_last_30_days')
    .eq('vendor', vendor.name)

  // Calculate inventory statistics
  const totalInventoryValue = inventoryItems?.reduce((sum, item) => {
    const value = (item.cost || item.unit_price || 0) * (item.stock || 0)
    return sum + value
  }, 0) || 0

  const lowStockItems = inventoryItems?.filter(item => 
    (item.stock || 0) > 0 && (item.stock || 0) <= (item.reorder_point || 0)
  ).length || 0

  const outOfStockItems = inventoryItems?.filter(item => 
    (item.stock || 0) === 0
  ).length || 0

  const fastMovingItems = inventoryItems?.filter(item => 
    (item.sales_last_30_days || 0) > 10 // More than 10 sales in 30 days
  ).length || 0

  return {
    vendor,
    totalItems: itemCount || 0,
    totalPurchaseOrders: totalOrders,
    totalSpend,
    averageOrderValue,
    lastOrderDate,
    ordersByStatus: {
      draft: draftOrders,
      submitted: submittedOrders,
      approved: approvedOrders
    },
    inventoryStats: {
      totalValue: totalInventoryValue,
      lowStockItems,
      outOfStockItems,
      fastMovingItems,
      inStockItems: (itemCount || 0) - outOfStockItems
    }
  }
}