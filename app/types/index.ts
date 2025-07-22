// Enhanced type definitions with validation schemas
import { z } from 'zod';

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number | null;
  unit_price: number;
  supplier: string | null;
  category: string | null;
  last_restocked: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  sync_type: 'finale_inventory' | 'manual_inventory' | 'purchase_order';
  status: 'success' | 'error' | 'partial' | 'running';
  synced_at: string;
  items_processed: number | null;
  items_updated: number | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
}

export interface FailedItem {
  id: number;
  sku: string;
  sync_id: string;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  resolved_at: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface Settings {
  id: string;
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  finale_api_url: string | null;
  finale_username: string | null;
  finale_password: string | null;
  alert_email: string | null;
  sendgrid_from_email: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const InventoryItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().regex(/^[A-Z0-9\-_]{2,50}$/, 'SKU must be 2-50 characters, alphanumeric with hyphens/underscores'),
  current_stock: z.number().min(0),
  minimum_stock: z.number().min(0),
  maximum_stock: z.number().min(0).nullable().optional(),
  unit_price: z.number().positive(),
  supplier: z.string().max(255).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  last_restocked: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
}).refine((data) => {
  if (data.maximum_stock !== null && data.maximum_stock !== undefined && data.maximum_stock < data.minimum_stock) {
    return false;
  }
  return true;
}, {
  message: "Maximum stock must be greater than or equal to minimum stock",
  path: ["maximum_stock"],
});

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  po_number: z.string().regex(/^PO-[0-9]{4,10}$/, 'PO number must follow format PO-XXXXXXXX'),
  vendor_id: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'approved', 'received', 'cancelled']),
  order_date: z.string().datetime(),
  expected_date: z.string().datetime().nullable().optional(),
  received_date: z.string().datetime().nullable().optional(),
  total_amount: z.number().min(0),
  notes: z.string().max(1000).nullable().optional(),
});

export const SyncLogSchema = z.object({
  id: z.string().uuid().optional(),
  sync_type: z.enum(['finale_inventory', 'manual_inventory', 'purchase_order']),
  status: z.enum(['success', 'error', 'partial', 'running']),
  synced_at: z.string().datetime(),
  items_processed: z.number().min(0).nullable(),
  items_updated: z.number().min(0).nullable(),
  duration_ms: z.number().positive().nullable(),
  error_message: z.string().max(2000).nullable(),
  metadata: z.record(z.any()).nullable(),
}).refine((data) => {
  if (data.items_updated !== null && data.items_processed !== null) {
    return data.items_updated <= data.items_processed;
  }
  return true;
}, {
  message: "Items updated cannot exceed items processed",
  path: ["items_updated"],
});

export const FailedItemSchema = z.object({
  id: z.number().optional(),
  sku: z.string().min(1).max(255),
  sync_id: z.string().uuid(),
  error_message: z.string().max(2000).nullable(),
  retry_count: z.number().min(0).max(10),
  last_retry_at: z.string().datetime().nullable(),
  resolved_at: z.string().datetime().nullable(),
  metadata: z.record(z.any()).nullable(),
});

export const SettingsSchema = z.object({
  id: z.string().uuid().optional(),
  auto_sync_enabled: z.boolean(),
  sync_frequency_minutes: z.number().min(1).max(1440), // 1 minute to 24 hours
  finale_api_url: z.string().url().nullable(),
  finale_username: z.string().min(1).max(255).nullable(),
  finale_password: z.string().min(1).max(255).nullable(),
  alert_email: z.string().email().nullable(),
  sendgrid_from_email: z.string().email().nullable(),
});

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: ValidationError[];
}

// =============================================================================
// DATABASE OPERATION TYPES
// =============================================================================

export interface DatabaseHealth {
  connected: boolean;
  latency_ms: number;
  active_connections: number;
  last_migration: string | null;
  issues: string[];
}

export interface SyncMetrics {
  success_rate: number;
  avg_duration_seconds: number;
  avg_items_per_sync: number;
  total_syncs_last_7_days: number;
  failed_items_count: number;
  last_successful_sync: string | null;
}

export interface IntegrityCheck {
  duplicate_skus: number;
  negative_stock_items: number;
  missing_critical_data: number;
  orphaned_records: number;
  constraint_violations: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type CreateInventoryItem = z.infer<typeof InventoryItemSchema>;
export type UpdateInventoryItem = Partial<CreateInventoryItem> & { id: string };

export type CreatePurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
export type UpdatePurchaseOrder = Partial<CreatePurchaseOrder> & { id: string };

export type CreateSyncLog = z.infer<typeof SyncLogSchema>;
export type CreateFailedItem = z.infer<typeof FailedItemSchema>;
export type CreateSettings = z.infer<typeof SettingsSchema>;

// =============================================================================
// FINALE API TYPES
// =============================================================================

export interface FinaleInventoryItem {
  ItemID: string;
  ItemName: string;
  ItemSKU: string;
  QuantityOnHand: number;
  UnitPrice: number;
  Category?: string;
  Supplier?: string;
  LastUpdated?: string;
}

export interface FinaleApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// =============================================================================
// EXPORT VALIDATION FUNCTIONS
// =============================================================================

export const validateInventoryItem = (data: unknown): CreateInventoryItem => {
  return InventoryItemSchema.parse(data);
};

export const validatePurchaseOrder = (data: unknown): CreatePurchaseOrder => {
  return PurchaseOrderSchema.parse(data);
};

export const validateSyncLog = (data: unknown): CreateSyncLog => {
  return SyncLogSchema.parse(data);
};

export const validateFailedItem = (data: unknown): CreateFailedItem => {
  return FailedItemSchema.parse(data);
};

export const validateSettings = (data: unknown): CreateSettings => {
  return SettingsSchema.parse(data);
};
