/**
 * Data Access Layer for Inventory Operations
 * Centralizes all database queries related to inventory management
 */

import { supabase } from '@/app/lib/supabase'
import { InventoryItem } from '@/app/types'
import { enhanceItemsWithCalculations } from '@/app/lib/inventory-calculations'
import { DatabaseError, NotFoundError, ValidationError } from '@/app/lib/errors'

export interface InventoryFilters {
  status?: 'all' | 'out-of-stock' | 'critical' | 'low-stock' | 'adequate' | 'overstocked' | 'in-stock'
  vendor?: string
  location?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  salesVelocity?: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays?: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: keyof InventoryItem
  sortDirection?: 'asc' | 'desc'
}

/**
 * Fetch inventory items with filters and pagination
 */
export async function getInventoryItems(
  filters: InventoryFilters = {},
  pagination: PaginationOptions = {}
): Promise<{
  items: InventoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const page = pagination.page || 1
  const limit = pagination.limit || 100
  const offset = (page - 1) * limit
  const sortBy = pagination.sortBy || 'product_name'
  const sortDirection = pagination.sortDirection || 'asc'

  // Build query
  let query = supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.status === 'out-of-stock') {
    query = query.eq('stock', 0)
  } else if (filters.status === 'critical') {
    query = query.or('stock.eq.0,stock.lte.reorder_point')
  } else if (filters.status === 'low-stock') {
    query = query.lte('stock', 'reorder_point').gt('stock', 0)
  } else if (filters.status === 'in-stock') {
    query = query.gt('stock', 0)
  }

  if (filters.vendor) {
    query = query.ilike('vendor', `%${filters.vendor}%`)
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  if (filters.search) {
    query = query.or(`sku.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`)
  }

  if (filters.minPrice !== undefined) {
    query = query.gte('cost', filters.minPrice)
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte('cost', filters.maxPrice)
  }

  // Apply sorting and pagination
  query = query
    .order(sortBy as string, { ascending: sortDirection === 'asc' })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new DatabaseError('fetch', error.message, error)
  }

  // Transform and enhance items
  const transformedItems = (data || []).map(item => ({
    ...item,
    current_stock: item.stock || 0,
    minimum_stock: item.reorder_point || 0,
    unit_price: item.cost || 0,
    name: item.product_name || item.name || ''
  }))

  const enhancedItems = enhanceItemsWithCalculations(transformedItems)

  // Apply additional filters that require calculations
  let filteredItems = enhancedItems

  if (filters.status === 'critical' || filters.status === 'low-stock' || 
      filters.status === 'adequate' || filters.status === 'overstocked') {
    filteredItems = filteredItems.filter(item => item.stock_status_level === filters.status)
  }

  if (filters.salesVelocity && filters.salesVelocity !== 'all') {
    filteredItems = filteredItems.filter(item => {
      const velocity = item.sales_velocity || 0
      switch (filters.salesVelocity) {
        case 'fast': return velocity > 1
        case 'medium': return velocity > 0.1 && velocity <= 1
        case 'slow': return velocity > 0 && velocity <= 0.1
        case 'dead': return velocity === 0
        default: return true
      }
    })
  }

  if (filters.stockDays && filters.stockDays !== 'all') {
    filteredItems = filteredItems.filter(item => {
      const days = item.days_until_stockout || 0
      switch (filters.stockDays) {
        case 'under-30': return days > 0 && days <= 30
        case '30-60': return days > 30 && days <= 60
        case '60-90': return days > 60 && days <= 90
        case 'over-90': return days > 90
        case 'over-180': return days > 180
        default: return true
      }
    })
  }

  return {
    items: filteredItems,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new DatabaseError('fetch', error.message, error)
  }

  if (!data) return null

  const transformedItem = {
    ...data,
    current_stock: data.stock || 0,
    minimum_stock: data.reorder_point || 0,
    unit_price: data.cost || 0,
    name: data.product_name || data.name || ''
  }

  const [enhancedItem] = enhanceItemsWithCalculations([transformedItem])
  return enhancedItem
}

/**
 * Get inventory summary statistics
 */
export async function getInventorySummary() {
  const { data: summary, error } = await supabase
    .from('inventory_summary')
    .select('*')
    .single()

  if (error) {
    // If summary view doesn't exist, calculate manually
    const { items } = await getInventoryItems({}, { limit: 5000 })
    
    return {
      total_items: items.length,
      out_of_stock_count: items.filter(i => i.current_stock === 0).length,
      low_stock_count: items.filter(i => i.stock_status_level === 'low').length,
      critical_count: items.filter(i => i.stock_status_level === 'critical').length,
      overstocked_count: items.filter(i => i.stock_status_level === 'overstocked').length,
      reorder_needed_count: items.filter(i => i.reorder_recommended).length,
      total_inventory_value: items.reduce((sum, item) => 
        sum + (item.current_stock * (item.unit_price || 0)), 0
      )
    }
  }

  return summary
}

/**
 * Update inventory stock level
 */
export async function updateInventoryStock(
  id: string, 
  newStock: number
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ 
      stock: newStock,
      last_updated: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new DatabaseError('update', error.message, error)
  }

  return getInventoryItemById(id) as Promise<InventoryItem>
}

/**
 * Update inventory cost/price
 */
export async function updateInventoryCost(
  id: string, 
  newCost: number
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ 
      cost: newCost,
      last_updated: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new DatabaseError('update', error.message, error)
  }

  return getInventoryItemById(id) as Promise<InventoryItem>
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(
  item: Partial<InventoryItem>
): Promise<InventoryItem> {
  const inventoryData = {
    sku: item.sku!,
    product_name: item.product_name || item.name,
    stock: item.stock || item.current_stock || 0,
    reorder_point: item.reorder_point || item.minimum_stock || 0,
    reorder_quantity: item.reorder_quantity || 0,
    vendor: item.vendor || null,
    cost: item.cost || item.unit_price || 0,
    location: item.location || 'Shipping',
    sales_last_30_days: item.sales_last_30_days || 0,
    sales_last_90_days: item.sales_last_90_days || 0,
    last_updated: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(inventoryData)
    .select()
    .single()

  if (error) {
    throw new DatabaseError('create', error.message, error)
  }

  return getInventoryItemById(data.id) as Promise<InventoryItem>
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  const updateData: any = {
    last_updated: new Date().toISOString()
  }

  // Map fields from updates
  if (updates.hasOwnProperty('stock') || updates.hasOwnProperty('current_stock')) {
    updateData.stock = updates.stock ?? updates.current_stock
  }
  if (updates.hasOwnProperty('cost') || updates.hasOwnProperty('unit_price')) {
    updateData.cost = updates.cost ?? updates.unit_price
  }
  if (updates.hasOwnProperty('reorder_point') || updates.hasOwnProperty('minimum_stock')) {
    updateData.reorder_point = updates.reorder_point ?? updates.minimum_stock
  }
  if (updates.hasOwnProperty('product_name') || updates.hasOwnProperty('name')) {
    updateData.product_name = updates.product_name ?? updates.name
  }
  if (updates.hasOwnProperty('vendor')) {
    updateData.vendor = updates.vendor
  }
  if (updates.hasOwnProperty('location')) {
    updateData.location = updates.location
  }
  if (updates.hasOwnProperty('sales_last_30_days')) {
    updateData.sales_last_30_days = updates.sales_last_30_days
  }
  if (updates.hasOwnProperty('sales_last_90_days')) {
    updateData.sales_last_90_days = updates.sales_last_90_days
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new DatabaseError('update', error.message, error)
  }

  return getInventoryItemById(id) as Promise<InventoryItem>
}

/**
 * Get items that need reordering
 */
export async function getItemsNeedingReorder(): Promise<InventoryItem[]> {
  const { items } = await getInventoryItems({}, { limit: 5000 })
  return items.filter(item => item.reorder_recommended)
}

/**
 * Get critical stock items
 */
export async function getCriticalStockItems(): Promise<InventoryItem[]> {
  const { items } = await getInventoryItems({ status: 'critical' }, { limit: 5000 })
  return items
}

/**
 * Get overstocked items
 */
export async function getOverstockedItems(): Promise<InventoryItem[]> {
  const { items } = await getInventoryItems({ status: 'overstocked' }, { limit: 5000 })
  return items
}