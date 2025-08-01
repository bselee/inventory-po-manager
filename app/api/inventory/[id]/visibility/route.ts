import { z } from 'zod'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { updateInventoryVisibility } from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const updateVisibilitySchema = z.object({
  hidden: z.boolean()
})

// PUT /api/inventory/[id]/visibility - Update inventory item visibility
export const PUT = createApiHandler(async ({ params, body }) => {
  const id = params?.id
  if (!id) {
    throw new Error('Item ID is required')
  }
  
  const { hidden } = body
  const updatedItem = await updateInventoryVisibility(id, hidden)
  
  return apiResponse({
    ...updatedItem,
    message: 'Visibility updated successfully'
  })
}, {
  validateBody: updateVisibilitySchema
})

// PATCH /api/inventory/[id]/visibility - Update inventory item visibility (same as PUT)
export const PATCH = PUT