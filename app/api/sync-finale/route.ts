import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { executeSync, SyncStrategy } from '@/app/lib/sync-service'
import { syncSchema } from '@/app/lib/validation-schemas'
import { rateLimiters } from '@/app/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/sync-finale - Trigger sync with Finale
export const POST = createApiHandler(async ({ body }) => {
  const { syncType = 'smart', forceSync = false, year } = body || {}

  const result = await executeSync({
    strategy: syncType as SyncStrategy,
    dryRun: false,
    filterYear: year ? parseInt(year) : undefined
  })
  
  return apiResponse(
    {
      success: result.success,
      itemsSynced: result.itemsSynced,
      itemsFailed: result.itemsFailed,
      duration: `${Math.round(result.duration / 1000)}s`,
      errors: result.errors
    },
    {
      message: `Sync completed: ${result.itemsSynced} items synced${result.itemsFailed > 0 ? `, ${result.itemsFailed} failed` : ''}`
    }
  )
}, {
  validateBody: syncSchema,
  requireAuth: false, // Temporarily disable auth for sync
  csrf: false, // Temporarily disable CSRF for testing
  rateLimit: {
    limiter: rateLimiters.sync,
    endpoint: 'sync-finale'
  }
})

// GET /api/sync-finale - Get sync status
export const GET = createApiHandler(async () => {
  // This could return current sync status if needed
  return apiResponse({
    message: 'Use POST to trigger sync'
  })
})