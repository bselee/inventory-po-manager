import { NextRequest, NextResponse } from 'next/server'
import { 
  getQueueStats, 
  clearFailedJobs, 
  retryFailedJobs,
  pauseQueue,
  resumeQueue,
  queueEmail,
  queueAlertEmail
} from '@/app/lib/email-queue'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/email-queue
 * Get email queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getQueueStats()
    
    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get queue statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logError('Failed to get queue stats', error, 'EmailQueueAPI')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get queue stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/email-queue
 * Perform queue management actions or send test emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'retry-failed':
        const retriedCount = await retryFailedJobs()
        logInfo(`Retried ${retriedCount} failed email jobs`, null, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: `Retried ${retriedCount} failed jobs`,
          count: retriedCount
        })

      case 'clear-failed':
        await clearFailedJobs()
        logInfo('Cleared failed email jobs', null, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: 'Failed jobs cleared'
        })

      case 'pause':
        await pauseQueue()
        logInfo('Email queue paused', null, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: 'Queue paused'
        })

      case 'resume':
        await resumeQueue()
        logInfo('Email queue resumed', null, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: 'Queue resumed'
        })

      case 'send-test':
        // Send a test email
        if (!data?.to || !data?.subject) {
          return NextResponse.json(
            { error: 'Missing required fields: to, subject' },
            { status: 400 }
          )
        }

        const jobId = await queueEmail({
          type: 'notification',
          to: data.to,
          subject: data.subject,
          htmlContent: data.htmlContent || '<p>This is a test email from the inventory management system.</p>',
          textContent: data.textContent || 'This is a test email from the inventory management system.',
          priority: data.priority || 5
        })

        logInfo(`Test email queued`, { jobId }, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: 'Test email queued',
          jobId
        })

      case 'send-alert':
        // Send a test alert
        if (!data?.type) {
          return NextResponse.json(
            { error: 'Missing required field: type' },
            { status: 400 }
          )
        }

        const alertJobId = await queueAlertEmail({
          type: data.type,
          count: data.count || 1,
          items: data.items || [
            {
              productSku: 'TEST-001',
              productName: 'Test Product',
              quantityOnHand: 0,
              reorderPoint: 10,
              reorderQuantity: 50,
              primarySupplierName: 'Test Supplier'
            }
          ],
          error: data.error,
          details: data.details
        })

        logInfo(`Test alert queued`, { alertJobId, type: data.type }, 'EmailQueueAPI')
        return NextResponse.json({
          success: true,
          message: `Test ${data.type} alert queued`,
          jobId: alertJobId
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    logError('Email queue operation failed', error, 'EmailQueueAPI')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}