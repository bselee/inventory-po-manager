import { z } from 'zod'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { updateInventoryItem } from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const toggleVisibilitySchema = z.object({
  hidden: z.boolean()
})

// PATCH /api/inventory/[id]/visibility - Toggle item visibility
export const PATCH = createApiHandler(async ({ params, body }) => {
  const id = params?.id
  if (!id) {
    throw new Error('Item ID is required')
  }
  
  const { hidden } = body
  const updatedItem = await updateInventoryItem(id, { hidden })
  
  return apiResponse({
    ...updatedItem,
    message: `Item ${hidden ? 'hidden' : 'shown'} successfully`
  })
}, {
  validateBody: toggleVisibilitySchema
})
