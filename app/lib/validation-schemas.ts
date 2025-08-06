/**
 * Centralized validation schemas for all API endpoints
 * Prevents SQL injection and ensures data integrity
 */

import { z } from 'zod'

// Common validation patterns
const safeString = z.string().regex(/^[a-zA-Z0-9\s\-_.@]+$/, 'Invalid characters detected')
const safeId = z.string().uuid().or(z.string().regex(/^[a-zA-Z0-9\-_]+$/))
const safeSku = z.string().regex(/^[A-Z0-9\-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores')
const email = z.string().email()
const positiveNumber = z.number().positive()
const nonNegativeNumber = z.number().nonnegative()

// Date validation
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

// Pagination schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().positive().max(1000)).optional(),
  sortBy: z.enum(['sku', 'name', 'quantity', 'vendor', 'updatedAt', 'salesVelocity', 'daysUntilStockout']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
})

// Filter schemas
export const inventoryFilterSchema = z.object({
  status: z.enum(['critical', 'low', 'adequate', 'overstocked']).optional(),
  vendor: safeString.optional(),
  location: safeString.optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
  minVelocity: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  maxVelocity: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  search: z.string().max(100).optional()
}).merge(paginationSchema)

// Inventory schemas
export const inventoryItemSchema = z.object({
  sku: safeSku,
  name: z.string().min(1).max(255),
  quantity: nonNegativeNumber,
  reorderPoint: nonNegativeNumber.optional(),
  reorderQuantity: positiveNumber.optional(),
  unitCost: nonNegativeNumber.optional(),
  vendor: safeString.optional(),
  location: safeString.optional(),
  discontinued: z.boolean().optional()
})

export const updateInventorySchema = inventoryItemSchema.partial()

export const inventoryStockUpdateSchema = z.object({
  quantity: nonNegativeNumber,
  reason: z.enum(['adjustment', 'sale', 'return', 'damage', 'received']).optional()
})

export const inventoryCostUpdateSchema = z.object({
  unitCost: nonNegativeNumber
})

export const inventoryVisibilitySchema = z.object({
  visibility: z.boolean()
})

export const inventoryActiveSchema = z.object({
  active: z.boolean()
})

// Purchase Order schemas
export const purchaseOrderSchema = z.object({
  orderNumber: z.string().regex(/^PO-\d{6}$/, 'Order number must be in format PO-XXXXXX'),
  vendorId: safeId,
  items: z.array(z.object({
    sku: safeSku,
    quantity: positiveNumber,
    unitCost: nonNegativeNumber,
    description: z.string().max(500).optional()
  })).min(1, 'At least one item is required'),
  status: z.enum(['draft', 'pending', 'sent', 'partial', 'received', 'cancelled']).optional(),
  orderDate: dateString.optional(),
  expectedDate: dateString.optional(),
  notes: z.string().max(1000).optional()
})

export const updatePurchaseOrderSchema = purchaseOrderSchema.partial()

export const createPurchaseOrderFromStockSchema = z.object({
  vendorId: safeId.optional(),
  includeAllLowStock: z.boolean().optional(),
  items: z.array(z.object({
    sku: safeSku,
    quantity: positiveNumber
  })).optional()
})

// Vendor schemas
export const vendorSchema = z.object({
  name: z.string().min(1).max(255),
  contactEmail: email.optional(),
  contactPhone: z.string().regex(/^[\d\s\-\(\)\+]+$/).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional()
})

export const updateVendorSchema = vendorSchema.partial()

// Settings schemas
export const settingsSchema = z.object({
  finaleApiKey: z.string().min(1).optional(),
  finaleApiSecret: z.string().min(1).optional(),
  finaleAccountPath: z.string().regex(/^[a-zA-Z0-9\-]+$/).optional(),
  syncInterval: z.number().min(1).max(1440).optional(), // minutes
  lowStockThreshold: positiveNumber.optional(),
  criticalStockThreshold: positiveNumber.optional(),
  sendgridApiKey: z.string().optional(),
  alertEmail: email.optional(),
  enableAutoSync: z.boolean().optional(),
  enableEmailAlerts: z.boolean().optional()
})

// Sync schemas
export const syncSchema = z.object({
  syncType: z.enum(['full', 'inventory', 'purchaseOrders', 'vendors', 'critical', 'smart']).optional(),
  forceSync: z.boolean().optional(),
  year: z.string().regex(/^\d{4}$/).optional()
})

export const syncRetrySchema = z.object({
  syncId: safeId
})

export const syncScheduleSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().min(5).max(1440)
})

// Auth schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(8).max(128)
})

export const registerSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(255)
})

// Sales data upload schema
export const salesDataUploadSchema = z.object({
  data: z.array(z.object({
    sku: safeSku,
    quantity: positiveNumber,
    date: dateString
  })).min(1, 'At least one sales record is required')
})

// Sync log query schema
export const syncLogQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().positive().max(100)).optional(),
  status: z.enum(['completed', 'failed', 'running']).optional(),
  syncType: z.enum(['full', 'inventory', 'purchaseOrders', 'vendors', 'critical', 'smart']).optional()
})

// Google Sheets sync schema
export const googleSheetsSyncSchema = z.object({
  spreadsheetId: z.string().regex(/^[a-zA-Z0-9\-_]+$/),
  range: z.string().regex(/^[A-Za-z]+\d+:[A-Za-z]+\d+$/).optional()
})

// Export schemas
export const exportSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']).optional(),
  includeHeaders: z.boolean().optional()
})

// Helper function to validate and sanitize input
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}

// SQL injection prevention helper
export function sanitizeSqlInput(input: string): string {
  // Remove or escape potentially dangerous SQL characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes, semicolons, backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
    .trim()
}

// ID validation helper
export function validateId(id: string): string {
  const validated = safeId.parse(id)
  return validated
}

// Batch validation helper
export function validateBatch<T>(schema: z.ZodSchema<T>, items: unknown[]): T[] {
  return items.map((item, index) => {
    try {
      return schema.parse(item)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed for item ${index + 1}: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  })
}