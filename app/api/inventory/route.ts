import { z } from 'zod'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  getInventorySummary
} from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Validation schemas
const inventoryQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
  status: z.enum(['all', 'out-of-stock', 'critical', 'low-stock', 'adequate', 'overstocked', 'in-stock']).optional(),
  vendor: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
})

const createInventorySchema = z.object({
  sku: z.string().min(1),
  product_name: z.string().min(1),
  stock: z.number().optional(),
  current_stock: z.number().optional(),
  reorder_point: z.number().optional(),
  minimum_stock: z.number().optional(),
  reorder_quantity: z.number().optional(),
  vendor: z.string().optional(),
  cost: z.number().optional(),
  unit_price: z.number().optional(),
  location: z.string().optional(),
  sales_last_30_days: z.number().optional(),
  sales_last_90_days: z.number().optional()
})

const updateInventorySchema = createInventorySchema.partial()

// GET /api/inventory - Fetch inventory items with enhanced data
export const GET = createApiHandler(async ({ query }) => {
  // Parse and validate query parameters
  const params = inventoryQuerySchema.parse(Object.fromEntries(query || []))
  
  // Fetch inventory with filters
  const result = await getInventoryItems(
    {
      status: params.status,
      vendor: params.vendor,
      location: params.location,
      search: params.search
    },
    {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy as any,
      sortDirection: params.sortDirection
    }
  )
  
  // Get summary statistics
  const summary = await getInventorySummary()

  return apiResponse({ 
    inventory: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    },
    summary
  })
})

// POST /api/inventory - Create new inventory item
export const POST = createApiHandler(async ({ body }) => {
  const item = await createInventoryItem(body)
  
  return apiResponse(
    { item },
    { 
      status: 201,
      message: 'Inventory item created successfully'
    }
  )
}, {
  validateBody: createInventorySchema
})

// PUT /api/inventory/[id] - Update inventory item
export const PUT = createApiHandler(async ({ request, body }) => {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()
  
  if (!id) {
    throw new Error('Item ID is required')
  }
  
  const item = await updateInventoryItem(id, body)

  return apiResponse({
    item,
    message: 'Inventory item updated successfully'
  })
}, {
  validateBody: updateInventorySchema
})