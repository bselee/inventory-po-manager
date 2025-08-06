import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import {
  getRunningSyncLog,
  markStuckSyncsAsFailed,
  getRecentSyncLogs,
  getSyncStats
} from '@/app/lib/data-access/index'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/sync-status-monitor - Get current sync status
export const GET = createApiHandler(async () => {
  const runningSync = await getRunningSyncLog()
  const recentSyncs = await getRecentSyncLogs(5)
  const stats = await getSyncStats(7) // Last 7 days
  
  return apiResponse({
    currentSync: runningSync,
    recentSyncs,
    stats
  })
})

// POST /api/sync-status-monitor - Monitor and clean up stuck sync operations
export const POST = createApiHandler(async () => {
  // Mark syncs running for more than 30 minutes as failed
  const markedCount = await markStuckSyncsAsFailed(30)
  
  if (markedCount === 0) {
    return apiResponse({ 
      success: true, 
      message: 'No stuck syncs found',
      stuckSyncs: 0
    })
  }
  // Send alert if configured
  // TODO: Implement email alert for stuck syncs if needed
  
  return apiResponse({
    success: true,
    message: `Marked ${markedCount} stuck sync operations as failed`,
    stuckSyncs: markedCount
  })
})