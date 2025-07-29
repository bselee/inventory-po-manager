import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { executeSync, SyncStrategy } from '@/app/lib/sync-service'
import { z } from 'zod'
import { rateLimiters } from '@/app/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Validation schema
const syncRequestSchema = z.object({
  strategy: z.enum(['smart', 'full', 'inventory', 'critical', 'active']).optional(),
  dryRun: z.boolean().optional(),
  filterYear: z.number().nullable().optional() // Allow null for "all records"
})

// POST /api/sync-finale - Trigger sync with Finale
export const POST = createApiHandler(async ({ body }) => {
  const { strategy = 'smart', dryRun = false, filterYear } = body || {}
  
  console.log(`[Sync API] Starting ${strategy} sync${dryRun ? ' (DRY RUN)' : ''}`)
  
  const result = await executeSync({
    strategy: strategy as SyncStrategy,
    dryRun,
    filterYear
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
  validateBody: syncRequestSchema,
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