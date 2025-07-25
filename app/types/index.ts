/**
 * Main types export file
 * All types are now consolidated in ./consolidated.ts
 */

// Re-export everything from the consolidated types file
export * from './consolidated'

// Additional legacy type exports for backward compatibility
import { z } from 'zod'

// Legacy Finale API types
export interface FinaleInventoryItem {
  ItemID: string
  ItemName: string
  ItemSKU: string
  QuantityOnHand: number
  UnitPrice: number
  Category?: string
  Supplier?: string
  LastUpdated?: string
}

export interface FinaleApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// Legacy validation error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiError extends Error {
  statusCode: number
  code: string
  details?: ValidationError[]
}

// Legacy database health types
export interface DatabaseHealth {
  connected: boolean
  latency_ms: number
  active_connections: number
  last_migration: string | null
  issues: string[]
}

export interface SyncMetrics {
  success_rate: number
  avg_duration_seconds: number
  avg_items_per_sync: number
  total_syncs_last_7_days: number
  failed_items_count: number
  last_successful_sync: string | null
}

export interface IntegrityCheck {
  duplicate_skus: number
  negative_stock_items: number
  missing_critical_data: number
  orphaned_records: number
  constraint_violations: number
}