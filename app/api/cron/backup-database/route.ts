import { NextResponse } from 'next/server'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import DatabaseBackup from '@/scripts/database-backup'
import { trackSync } from '@/app/lib/monitoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/cron/backup-database - Automated database backup
export const POST = createApiHandler(async ({ request }) => {
  const authHeader = request.headers.get('authorization')
  
  // Verify cron secret for Vercel cron jobs
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logError('[Backup Cron] Unauthorized request')
    return apiResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  const startTime = Date.now()
  
  try {
    const backup = new DatabaseBackup()
    await backup.backup()
    
    const duration = Date.now() - startTime
    
    // Track backup metrics
    trackSync('database_backup', 1, 0, duration)
    
    return apiResponse({
      success: true,
      message: 'Database backup completed successfully',
      duration: `${Math.round(duration / 1000)}s`
    })
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Track failed backup
    trackSync('database_backup', 0, 1, duration)
    
    logError('[Backup Cron] Backup failed:', error)
    
    return apiResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed',
        duration: `${Math.round(duration / 1000)}s`
      },
      { status: 500 }
    )
  }
})

// GET endpoint for manual trigger (development/testing)
export const GET = createApiHandler(async () => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return apiResponse(
      { error: 'Manual backup not allowed in production' },
      { status: 403 }
    )
  }
  const startTime = Date.now()
  
  try {
    const backup = new DatabaseBackup()
    await backup.backup()
    
    const duration = Date.now() - startTime
    
    return apiResponse({
      success: true,
      message: 'Manual backup completed successfully',
      duration: `${Math.round(duration / 1000)}s`
    })
  } catch (error) {
    const duration = Date.now() - startTime
    
    return apiResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed',
        duration: `${Math.round(duration / 1000)}s`
      },
      { status: 500 }
    )
  }
})