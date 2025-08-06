import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { inventoryFilterSchema, inventoryItemSchema, updateInventorySchema } from '@/app/lib/validation-schemas'
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  getInventorySummary
} from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/inventory - Fetch inventory items with enhanced data
export const GET = createApiHandler(async ({ query }) => {
  // Parse and validate query parameters
  const params = inventoryFilterSchema.parse(Object.fromEntries(query || []))
  
  // Fetch inventory with filters
  const result = await getInventoryItems(
    {
      status: params.status,
      vendor: params.vendor,
      location: params.location,
      search: params.search
    },
    {
      page: params.page || 1,
      limit: params.limit || 100,
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
}, {
  validateQuery: inventoryFilterSchema
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
  validateBody: inventoryItemSchema
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