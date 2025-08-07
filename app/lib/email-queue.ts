import Bull from 'bull'
import { supabase } from './supabase'
import { logError, logInfo, logWarn } from './logger'
import sgMail from '@sendgrid/mail'

// Define job data types
export interface EmailJobData {
  type: 'alert' | 'report' | 'notification'
  to: string | string[]
  subject: string
  htmlContent: string
  textContent: string
  priority?: number // 1 (highest) to 10 (lowest)
  metadata?: Record<string, any>
  retryCount?: number
}

export interface AlertEmailData {
  type: 'failure' | 'warning' | 'success' | 'stuck' | 'out-of-stock' | 'reorder-needed'
  syncId?: number
  error?: string
  details?: any
  items?: any[]
  count?: number
}

// Queue configuration
const QUEUE_OPTIONS = {
  redis: {
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
    // Parse Redis URL if provided
    ...(process.env.REDIS_URL ? (() => {
      const url = new URL(process.env.REDIS_URL)
      return {
        port: parseInt(url.port || '6379'),
        host: url.hostname,
        password: url.password
      }
    })() : {})
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  }
}

// Create email queue
const emailQueue = new Bull<EmailJobData>('email-queue', QUEUE_OPTIONS)

// Track initialization state
let isInitialized = false
let sendGridConfigured = false

/**
 * Initialize email queue and SendGrid
 */
export async function initializeEmailQueue() {
  if (isInitialized) return

  try {
    // Get SendGrid configuration from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('sendgrid_api_key, alert_email, sendgrid_from_email')
      .single()

    if (settings?.sendgrid_api_key) {
      sgMail.setApiKey(settings.sendgrid_api_key)
      sendGridConfigured = true
      logInfo('Email queue initialized with SendGrid', null, 'EmailQueue')
    } else {
      logWarn('SendGrid not configured - email alerts disabled', null, 'EmailQueue')
    }

    // Set up queue processors
    setupQueueProcessors()
    
    // Set up queue event handlers
    setupQueueEvents()

    isInitialized = true
  } catch (error) {
    logError('Failed to initialize email queue', error, 'EmailQueue')
    throw error
  }
}

/**
 * Set up queue processors
 */
function setupQueueProcessors() {
  // Process email jobs
  emailQueue.process(async (job) => {
    const { data } = job
    
    if (!sendGridConfigured) {
      throw new Error('SendGrid not configured')
    }

    try {
      // Get current settings for from email
      const { data: settings } = await supabase
        .from('settings')
        .select('sendgrid_from_email, alert_email')
        .single()

      const msg = {
        to: data.to || settings?.alert_email,
        from: settings?.sendgrid_from_email || process.env.SENDGRID_FROM_EMAIL || 'noreply@inventory-manager.com',
        subject: data.subject,
        text: data.textContent,
        html: data.htmlContent
      }

      // Send email via SendGrid
      await sgMail.send(msg)

      // Log successful send
      await logEmailSent(data, 'success')

      logInfo(`Email sent successfully: ${data.subject}`, { jobId: job.id }, 'EmailQueue')
      
      return { success: true, messageId: job.id }
    } catch (error) {
      logError(`Failed to send email: ${data.subject}`, error, 'EmailQueue')
      
      // Log failed send
      await logEmailSent(data, 'error', error)
      
      // Re-throw to trigger retry
      throw error
    }
  })
}

/**
 * Set up queue event handlers
 */
function setupQueueEvents() {
  emailQueue.on('completed', (job, result) => {
    logInfo(`Job ${job.id} completed`, result, 'EmailQueue')
  })

  emailQueue.on('failed', (job, err) => {
    logError(`Job ${job.id} failed`, err, 'EmailQueue')
  })

  emailQueue.on('stalled', (job) => {
    logWarn(`Job ${job.id} stalled`, null, 'EmailQueue')
  })

  emailQueue.on('error', (error) => {
    logError('Queue error', error, 'EmailQueue')
  })
}

/**
 * Log email send attempt to database
 */
async function logEmailSent(data: EmailJobData, status: 'success' | 'error', error?: any) {
  try {
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'email_alert',
        status,
        synced_at: new Date().toISOString(),
        errors: error ? [error instanceof Error ? error.message : String(error)] : null,
        metadata: {
          type: data.type,
          subject: data.subject,
          recipient: data.to,
          priority: data.priority,
          ...data.metadata
        }
      })
  } catch (err) {
    logError('Failed to log email event', err, 'EmailQueue')
  }
}

/**
 * Add an email to the queue
 */
export async function queueEmail(data: EmailJobData) {
  try {
    // Ensure queue is initialized
    if (!isInitialized) {
      await initializeEmailQueue()
    }

    const job = await emailQueue.add(data, {
      priority: data.priority || 5,
      attempts: data.retryCount || 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      }
    })

    logInfo(`Email queued: ${data.subject}`, { jobId: job.id }, 'EmailQueue')
    
    return job.id
  } catch (error) {
    logError('Failed to queue email', error, 'EmailQueue')
    throw error
  }
}

/**
 * Queue an alert email
 */
export async function queueAlertEmail(alert: AlertEmailData) {
  try {
    // Get alert email from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('alert_email')
      .single()

    if (!settings?.alert_email) {
      logWarn('No alert email configured', null, 'EmailQueue')
      return
    }

    // Build email content based on alert type
    const emailData = await buildAlertEmail(alert, settings.alert_email)
    
    if (emailData) {
      // Set priority based on alert type
      const priority = getPriorityForAlertType(alert.type)
      
      return await queueEmail({
        ...emailData,
        priority,
        metadata: {
          alertType: alert.type,
          syncId: alert.syncId
        }
      })
    }
  } catch (error) {
    logError('Failed to queue alert email', error, 'EmailQueue')
    throw error
  }
}

/**
 * Build alert email content
 */
async function buildAlertEmail(alert: AlertEmailData, recipientEmail: string): Promise<EmailJobData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  switch (alert.type) {
    case 'failure':
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '🚨 Finale Sync Failed',
        htmlContent: `
          <h2>Finale Sync Failure Alert</h2>
          <p><strong>Error:</strong> ${alert.error || 'Unknown error'}</p>
          ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.details ? `
            <h3>Details:</h3>
            <pre>${JSON.stringify(alert.details, null, 2)}</pre>
          ` : ''}
          <hr>
          <p><a href="${baseUrl}/sync-status">View Sync Dashboard</a></p>
        `,
        textContent: `Finale Sync Failed\n\nError: ${alert.error || 'Unknown error'}\nTime: ${new Date().toLocaleString()}`
      }

    case 'out-of-stock':
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '🚨 Out of Stock Alert - Immediate Action Required',
        htmlContent: `
          <h2>⚠️ Critical: Out of Stock Alert</h2>
          <p style="color: red;"><strong>${alert.count || 0} items</strong> are now OUT OF STOCK!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.items && alert.items.length > 0 ? `
            <h3>Out of Stock Items:</h3>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
              <tr style="background-color: #f0f0f0;">
                <th>SKU</th>
                <th>Product Name</th>
                <th>Reorder Point</th>
                <th>Supplier</th>
                <th>Action</th>
              </tr>
              ${alert.items.slice(0, 20).map(item => `
                <tr>
                  <td><strong>${item.productSku || item.sku}</strong></td>
                  <td>${item.productName || 'N/A'}</td>
                  <td>${item.reorderPoint || 0}</td>
                  <td>${item.primarySupplierName || 'N/A'}</td>
                  <td><a href="${baseUrl}/purchase-orders/new?sku=${item.productSku || item.sku}">Create PO</a></td>
                </tr>
              `).join('')}
            </table>
            ${alert.items.length > 20 ? `<p><strong>... and ${alert.items.length - 20} more items</strong></p>` : ''}
          ` : ''}
          <hr>
          <div style="background-color: #ffe6e6; padding: 10px; margin: 10px 0;">
            <p><strong>⚡ ACTION REQUIRED:</strong></p>
            <ol>
              <li>Review the out-of-stock items above</li>
              <li>Create purchase orders immediately</li>
              <li>Contact suppliers for expedited shipping if needed</li>
            </ol>
          </div>
          <p>
            <a href="${baseUrl}/inventory" style="background-color: #ff4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Inventory Dashboard
            </a>
            &nbsp;&nbsp;
            <a href="${baseUrl}/purchase-orders/new" style="background-color: #4444ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Create Purchase Order
            </a>
          </p>
        `,
        textContent: `CRITICAL: Out of Stock Alert\n\n${alert.count || 0} items are OUT OF STOCK.\nTime: ${new Date().toLocaleString()}\n\nImmediate action required. Check the inventory system now.`
      }

    case 'reorder-needed':
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '📦 Reorder Alert - Low Stock Items',
        htmlContent: `
          <h2>📦 Reorder Alert</h2>
          <p><strong>${alert.count || 0} items</strong> have fallen below their reorder point.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.items && alert.items.length > 0 ? `
            <h3>Items Needing Reorder:</h3>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
              <tr style="background-color: #f0f0f0;">
                <th>SKU</th>
                <th>Product Name</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Reorder Qty</th>
                <th>Supplier</th>
                <th>Action</th>
              </tr>
              ${alert.items.slice(0, 20).map(item => {
                const stockLevel = item.quantityOnHand || 0
                const isUrgent = stockLevel <= (item.reorderPoint || 0) * 0.5
                const rowStyle = isUrgent ? 'background-color: #ffe6e6;' : ''
                return `
                  <tr style="${rowStyle}">
                    <td><strong>${item.productSku || item.sku}</strong></td>
                    <td>${item.productName || 'N/A'}</td>
                    <td style="color: ${isUrgent ? 'red' : 'orange'};">${stockLevel}</td>
                    <td>${item.reorderPoint || 0}</td>
                    <td><strong>${item.reorderQuantity || 0}</strong></td>
                    <td>${item.primarySupplierName || 'N/A'}</td>
                    <td><a href="${baseUrl}/purchase-orders/new?sku=${item.productSku || item.sku}">Create PO</a></td>
                  </tr>
                `
              }).join('')}
            </table>
            ${alert.items.length > 20 ? `<p><strong>... and ${alert.items.length - 20} more items</strong></p>` : ''}
          ` : ''}
          <hr>
          <div style="background-color: #fff3cd; padding: 10px; margin: 10px 0;">
            <p><strong>📋 Recommended Actions:</strong></p>
            <ol>
              <li>Review items marked in red (urgent - below 50% of reorder point)</li>
              <li>Create purchase orders for critical items first</li>
              <li>Consider consolidating orders by supplier</li>
            </ol>
          </div>
          <p>
            <a href="${baseUrl}/purchase-orders/new" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Create Purchase Orders
            </a>
          </p>
        `,
        textContent: `Reorder Alert\n\n${alert.count || 0} items need reordering.\nTime: ${new Date().toLocaleString()}\n\nPlease check the inventory system.`
      }

    case 'stuck':
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '🔴 Sync Process Stuck - Manual Intervention Required',
        htmlContent: `
          <h2>🔴 Stuck Sync Alert</h2>
          <p style="color: red;">A sync process has been running for over 30 minutes and appears to be stuck.</p>
          ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.details ? `
            <h3>Details:</h3>
            <ul>
              <li><strong>Started At:</strong> ${alert.details.startedAt}</li>
              <li><strong>Running For:</strong> ${alert.details.runningFor}</li>
            </ul>
          ` : ''}
          <hr>
          <div style="background-color: #ffe6e6; padding: 10px; margin: 10px 0;">
            <p><strong>⚠️ Manual Intervention Required:</strong></p>
            <ol>
              <li>Check the sync status dashboard</li>
              <li>Consider stopping the stuck sync</li>
              <li>Review error logs for issues</li>
              <li>Restart the sync if necessary</li>
            </ol>
          </div>
          <p>
            <a href="${baseUrl}/sync-status" style="background-color: #ff4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Sync Dashboard
            </a>
          </p>
        `,
        textContent: `Stuck Sync Alert\n\nA sync has been running for over 30 minutes.\nTime: ${new Date().toLocaleString()}\n\nManual intervention required.`
      }

    case 'warning':
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '⚠️ Sync Completed with Warnings',
        htmlContent: `
          <h2>⚠️ Sync Warning</h2>
          <p>The sync completed but encountered some issues.</p>
          ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.details ? `
            <h3>Details:</h3>
            <ul>
              ${alert.details.itemsFailed ? `<li><strong>Items Failed:</strong> ${alert.details.itemsFailed}</li>` : ''}
              ${alert.details.errors?.length ? `<li><strong>Errors:</strong> ${alert.details.errors.length}</li>` : ''}
              ${alert.details.duration ? `<li><strong>Duration:</strong> ${alert.details.duration}ms</li>` : ''}
            </ul>
          ` : ''}
          <hr>
          <p><a href="${baseUrl}/sync-status">View Sync Dashboard</a></p>
        `,
        textContent: `Sync Warning\n\nThe sync completed with issues.\nTime: ${new Date().toLocaleString()}`
      }

    case 'success':
      // Only send success emails if there were recent failures
      const { data: recentFailure } = await supabase
        .from('sync_logs')
        .select('id')
        .eq('sync_type', 'finale_inventory')
        .eq('status', 'error')
        .gte('synced_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (!recentFailure) return null // Don't send success email if no recent failures
      
      return {
        type: 'alert',
        to: recipientEmail,
        subject: '✅ Sync Recovered Successfully',
        htmlContent: `
          <h2>✅ Sync Success</h2>
          <p>The sync has recovered and completed successfully after previous failures.</p>
          ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${alert.details ? `
            <h3>Details:</h3>
            <ul>
              <li><strong>Items Processed:</strong> ${alert.details.itemsProcessed || 0}</li>
              <li><strong>Items Updated:</strong> ${alert.details.itemsUpdated || 0}</li>
              <li><strong>Duration:</strong> ${alert.details.duration || 0}ms</li>
            </ul>
          ` : ''}
        `,
        textContent: `Sync Recovered\n\nThe sync completed successfully.\nTime: ${new Date().toLocaleString()}`
      }

    default:
      return null
  }
}

/**
 * Get priority for alert type (1 = highest, 10 = lowest)
 */
function getPriorityForAlertType(type: AlertEmailData['type']): number {
  switch (type) {
    case 'out-of-stock':
      return 1 // Highest priority
    case 'failure':
      return 2
    case 'stuck':
      return 3
    case 'reorder-needed':
      return 4
    case 'warning':
      return 5
    case 'success':
      return 8
    default:
      return 5
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    }
  } catch (error) {
    logError('Failed to get queue stats', error, 'EmailQueue')
    return null
  }
}

/**
 * Clear failed jobs from queue
 */
export async function clearFailedJobs() {
  try {
    await emailQueue.clean(0, 'failed')
    logInfo('Cleared failed jobs from queue', null, 'EmailQueue')
  } catch (error) {
    logError('Failed to clear failed jobs', error, 'EmailQueue')
    throw error
  }
}

/**
 * Retry all failed jobs
 */
export async function retryFailedJobs() {
  try {
    const failedJobs = await emailQueue.getFailed()
    let retried = 0
    
    for (const job of failedJobs) {
      await job.retry()
      retried++
    }
    
    logInfo(`Retried ${retried} failed jobs`, null, 'EmailQueue')
    return retried
  } catch (error) {
    logError('Failed to retry failed jobs', error, 'EmailQueue')
    throw error
  }
}

/**
 * Pause the queue
 */
export async function pauseQueue() {
  await emailQueue.pause()
  logInfo('Email queue paused', null, 'EmailQueue')
}

/**
 * Resume the queue
 */
export async function resumeQueue() {
  await emailQueue.resume()
  logInfo('Email queue resumed', null, 'EmailQueue')
}

/**
 * Close the queue connection
 */
export async function closeQueue() {
  await emailQueue.close()
  logInfo('Email queue closed', null, 'EmailQueue')
}

// Initialize on module load if in production
if (process.env.NODE_ENV === 'production') {
  initializeEmailQueue().catch(error => {
    logError('Failed to auto-initialize email queue', error, 'EmailQueue')
  })
}