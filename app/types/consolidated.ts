/**
 * Consolidated Type Definitions
 * This file contains all type definitions used across the application
 * ensuring consistency between database, API, and frontend
 */

import { z } from 'zod'

// =============================================================================
// INVENTORY TYPES
// =============================================================================

/**
 * Core inventory item type matching database schema
 */
export interface InventoryItem {
  // Primary fields
  id: string
  sku: string
  product_name?: string
  name?: string // Alias for product_name
  
  // Stock levels
  stock?: number // Database field
  current_stock: number // Calculated/normalized field
  reorder_point?: number // Database field
  minimum_stock: number // Calculated/normalized field
  maximum_stock?: number
  reorder_quantity?: number
  
  // Pricing
  cost?: number // Database field
  unit_price?: number // Calculated/normalized field
  
  // Vendor/Location
  vendor?: string
  location?: string
  
  // Sales data
  sales_last_30_days?: number
  sales_last_90_days?: number
  
  // Calculated fields (added by business logic)
  sales_velocity?: number
  days_until_stockout?: number
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  trend?: 'increasing' | 'decreasing' | 'stable'
  reorder_recommended?: boolean
  inventory_value?: number
  
  // Metadata
  last_updated?: string
  created_at?: string
  finale_id?: string
  active?: boolean
}

/**
 * Extended inventory item for table display
 */
export interface InventoryTableItem extends InventoryItem {
  selected?: boolean
  editing?: boolean
}

/**
 * Inventory summary statistics
 */
export interface InventorySummary {
  total_items: number
  out_of_stock_count: number
  low_stock_count: number
  critical_count?: number
  overstocked_count?: number
  reorder_needed_count?: number
  total_inventory_value: number
}

// =============================================================================
// VENDOR TYPES
// =============================================================================

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

// =============================================================================
// PURCHASE ORDER TYPES
// =============================================================================

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  vendor?: Vendor // Joined data
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled'
  order_date: string
  expected_date?: string
  received_date?: string
  total_amount: number
  notes?: string
  items?: PurchaseOrderItem[]
  finale_po_id?: string
  created_at?: string
  updated_at?: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_item_id: string
  inventory_item?: InventoryItem // Joined data
  quantity: number
  unit_cost: number
  total_cost: number
  received_quantity?: number
  notes?: string
}

// =============================================================================
// SYNC TYPES
// =============================================================================

export interface SyncLog {
  id: string
  sync_type: 'full' | 'inventory' | 'critical' | 'active' | 'smart'
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  items_synced?: number
  errors?: any
  duration_ms?: number
  created_at?: string
  
  // Legacy fields for compatibility
  synced_at?: string // Same as started_at
  items_processed?: number // Same as items_synced
  items_updated?: number // Same as items_synced
  error_message?: string // Extracted from errors
  metadata?: Record<string, any>
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface Settings {
  id: number // Always 1
  
  // Finale configuration
  finale_api_key?: string
  finale_api_secret?: string
  finale_account_path?: string
  
  // Email configuration
  alert_email?: string
  sendgrid_api_key?: string
  email_alerts_enabled: boolean
  
  // Sync configuration
  sync_enabled: boolean
  last_sync_date?: string
  low_stock_threshold: number
  auto_generate_po: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedApiResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  details?: any
  status?: number
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface InventoryFilters {
  status?: 'all' | 'out-of-stock' | 'critical' | 'low-stock' | 'adequate' | 'overstocked' | 'in-stock'
  vendor?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  priceRange?: { min: number; max: number }
  salesVelocity?: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays?: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  reorderNeeded?: boolean
  hasValue?: boolean
  search?: string
}

export interface SortConfig {
  key: keyof InventoryItem
  direction: 'asc' | 'desc'
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: keyof InventoryItem
  sortDirection?: 'asc' | 'desc'
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const inventoryItemSchema = z.object({
  sku: z.string().min(1),
  product_name: z.string().min(1),
  stock: z.number().min(0).optional(),
  current_stock: z.number().min(0).optional(),
  reorder_point: z.number().min(0).optional(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional(),
  reorder_quantity: z.number().min(0).optional(),
  vendor: z.string().optional(),
  cost: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
  location: z.string().optional(),
  sales_last_30_days: z.number().min(0).optional(),
  sales_last_90_days: z.number().min(0).optional()
})

export const vendorSchema = z.object({
  name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  lead_time_days: z.number().min(0).optional(),
  minimum_order: z.number().min(0).optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true)
})

export const settingsSchema = z.object({
  finale_api_key: z.string().optional().nullable(),
  finale_api_secret: z.string().optional().nullable(),
  finale_account_path: z.string().optional().nullable(),
  alert_email: z.string().email().optional().nullable(),
  sendgrid_api_key: z.string().optional().nullable(),
  email_alerts_enabled: z.boolean().optional(),
  sync_enabled: z.boolean().optional(),
  low_stock_threshold: z.number().min(0).optional(),
  auto_generate_po: z.boolean().optional()
})

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type ViewMode = 'table' | 'planning' | 'analytics'

export type PresetFilter = {
  id: string
  label: string
  icon: any // Lucide icon component
  color: string
  bgColor: string
  borderColor: string
  config: InventoryFilters
}

// Type guards
export function isInventoryItem(item: any): item is InventoryItem {
  return item && typeof item.sku === 'string' && typeof item.current_stock === 'number'
}

export function isSyncLog(log: any): log is SyncLog {
  return log && typeof log.sync_type === 'string' && typeof log.status === 'string'
}