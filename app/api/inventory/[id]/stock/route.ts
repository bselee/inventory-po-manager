import { z } from 'zod'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { updateInventoryStock } from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const updateStockSchema = z.object({
  stock: z.number().min(0)
})

// PUT /api/inventory/[id]/stock - Update inventory stock level
export const PUT = createApiHandler(async ({ params, body }) => {
  const id = params?.id
  if (!id) {
    throw new Error('Item ID is required')
  }
  
  const { stock } = body
  const updatedItem = await updateInventoryStock(id, stock)
  
  return apiResponse({
    ...updatedItem,
    message: 'Stock updated successfully'
  })
}, {
  validateBody: updateStockSchema
})