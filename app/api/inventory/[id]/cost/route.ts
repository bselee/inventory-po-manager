import { z } from 'zod'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { updateInventoryCost } from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const updateCostSchema = z.object({
  cost: z.number().min(0)
})

// PUT /api/inventory/[id]/cost - Update inventory item cost
export const PUT = createApiHandler(async ({ params, body }) => {
  const id = params?.id
  if (!id) {
    throw new Error('Item ID is required')
  }
  
  const { cost } = body
  const updatedItem = await updateInventoryCost(id, cost)
  
  return apiResponse({
    ...updatedItem,
    message: 'Cost updated successfully'
  })
}, {
  validateBody: updateCostSchema
})