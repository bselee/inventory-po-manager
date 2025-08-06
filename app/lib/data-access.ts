import { supabase } from './supabase'

export interface InventoryFilters {
  status?: string
  vendor?: string
  location?: string
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getInventoryItems(
  filters: InventoryFilters = {},
  options: PaginationOptions = {}
) {
  const { page = 1, limit = 100, sortBy = 'sku', sortDirection = 'asc' } = options
  
  // Log for debugging
  const offset = (page - 1) * limit

  // Start query
  let query = supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.vendor) {
    query = query.eq('vendor', filters.vendor)
  }

  if (filters.location) {
    query = query.eq('location', filters.location)
  }

  if (filters.search) {
    query = query.or(`sku.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`)
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    switch (filters.status) {
      case 'out-of-stock':
        query = query.eq('current_stock', 0)
        break
      case 'critical':
        query = query.filter('current_stock', 'gt', 0)
        query = query.filter('current_stock', 'lte', 'reorder_point * 2')
        break
      case 'low-stock':
        query = query.filter('current_stock', 'gt', 'reorder_point')
        // Note: Can't use multiplication in filter, so we're just checking > reorder_point
        break
      case 'in-stock':
        query = query.filter('current_stock', 'gt', 0)
        break
    }
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  // Execute query
  const { data: items, error, count } = await query

  if (error) {
    logError('Error fetching inventory:', error)
    throw error
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  // Map database columns to expected frontend fields
  const mappedItems = (items || []).map(item => ({
    ...item,
    current_stock: item.stock,
    unit_price: item.cost,
    unit_cost: item.cost
  }))

  return {
    items: mappedItems,
    page,
    limit,
    total,
    totalPages
  }
}

export async function getInventorySummary() {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('stock, cost, reorder_point')

  if (error) {
    logError('Error fetching inventory summary:', error)
    return {
      total_items: 0,
      out_of_stock_count: 0,
      low_stock_count: 0,
      total_inventory_value: 0
    }
  }

  const summary = {
    total_items: items?.length || 0,
    out_of_stock_count: items?.filter(item => item.stock === 0).length || 0,
    low_stock_count: items?.filter(item => 
      item.stock > 0 && item.stock <= item.reorder_point
    ).length || 0,
    total_inventory_value: items?.reduce((sum, item) => 
      sum + (item.stock * (item.cost || 0)), 0
    ) || 0
  }

  return summary
}

export async function createInventoryItem(data: any) {
  // Map common field names
  const item = {
    sku: data.sku,
    product_name: data.product_name,
    current_stock: data.current_stock || data.stock || 0,
    reorder_point: data.reorder_point || data.minimum_stock || 0,
    reorder_quantity: data.reorder_quantity || 0,
    unit_cost: data.unit_cost || data.cost || 0,
    vendor: data.vendor || '',
    location: data.location || 'Main',
    sales_last_30_days: data.sales_last_30_days || 0,
    sales_last_90_days: data.sales_last_90_days || 0,
    last_updated: new Date().toISOString()
  }

  const { data: created, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .single()

  if (error) {
    logError('Error creating inventory item:', error)
    throw error
  }

  return created
}

export async function updateInventoryItem(id: string, data: any) {
  const updates: any = {
    last_updated: new Date().toISOString()
  }

  // Only update provided fields
  if (data.sku !== undefined) updates.sku = data.sku
  if (data.product_name !== undefined) updates.product_name = data.product_name
  if (data.current_stock !== undefined) updates.current_stock = data.current_stock
  if (data.stock !== undefined) updates.current_stock = data.stock
  if (data.reorder_point !== undefined) updates.reorder_point = data.reorder_point
  if (data.minimum_stock !== undefined) updates.reorder_point = data.minimum_stock
  if (data.reorder_quantity !== undefined) updates.reorder_quantity = data.reorder_quantity
  if (data.unit_cost !== undefined) updates.unit_cost = data.unit_cost
  if (data.cost !== undefined) updates.unit_cost = data.cost
  if (data.vendor !== undefined) updates.vendor = data.vendor
  if (data.location !== undefined) updates.location = data.location
  if (data.sales_last_30_days !== undefined) updates.sales_last_30_days = data.sales_last_30_days
  if (data.sales_last_90_days !== undefined) updates.sales_last_90_days = data.sales_last_90_days
  if (data.hidden !== undefined) updates.hidden = data.hidden

  const { data: updated, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('Error updating inventory item:', error)
    throw error
  }

  return updated
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)

  if (error) {
    logError('Error deleting inventory item:', error)
    throw error
  }

  return true
}

// Specific update functions for API routes
export async function updateInventoryStock(id: string, stock: number) {
  return updateInventoryItem(id, { stock })
}

export async function updateInventoryCost(id: string, cost: number) {
  return updateInventoryItem(id, { cost })
}

export async function updateInventoryVisibility(id: string, hidden: boolean) {
  return updateInventoryItem(id, { hidden })
}

// Settings functions
export async function getSettings(): Promise<any> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is ok
    logError('Error fetching settings:', error)
    throw error
  }

  return data
}

export async function upsertSettings(settings: any): Promise<any> {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ ...settings, id: 1 })
    .select()
    .single()

  if (error) {
    logError('Error updating settings:', error)
    throw error
  }

  return data
}

export async function getFinaleConfig() {
  const settings = await getSettings()
  if (!settings) return null

  return {
    apiKey: settings.finale_api_key || process.env.FINALE_API_KEY,
    apiSecret: settings.finale_api_secret || process.env.FINALE_API_SECRET,
    accountPath: settings.finale_account_path || process.env.FINALE_ACCOUNT_PATH
  }
}

export async function getEmailConfig() {
  const settings = await getSettings()
  if (!settings) return null

  return {
    sendgridApiKey: settings.sendgrid_api_key || process.env.SENDGRID_API_KEY,
    alertEmail: settings.alert_email
  }
}