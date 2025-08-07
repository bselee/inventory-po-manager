import sgMail from '@sendgrid/mail'
import { supabase } from './supabase'
import { logError, logInfo, logWarn } from './logger'
import { queueAlertEmail, initializeEmailQueue, AlertEmailData } from './email-queue'

interface SyncAlert {
  type: 'failure' | 'warning' | 'success' | 'stuck' | 'out-of-stock' | 'reorder-needed'
  syncId?: number
  error?: string
  details?: any
  items?: any[]
  count?: number
}

export class EmailAlertService {
  private isConfigured: boolean = false
  private alertEmail?: string
  
  async initialize() {
    try {
      // Initialize the email queue first
      await initializeEmailQueue()
      
      // Get SendGrid config from settings
      const { data: settings } = await supabase
        .from('settings')
        .select('sendgrid_api_key, alert_email')
        .single()
      
      if (settings?.sendgrid_api_key && settings?.alert_email) {
        sgMail.setApiKey(settings.sendgrid_api_key)
        this.alertEmail = settings.alert_email
        this.isConfigured = true
        logInfo('Email alerts initialized', null, 'EmailAlerts')
      } else {
        logWarn('SendGrid not configured', null, 'EmailAlerts')
      }
    } catch (error) {
      logError('Failed to initialize email alerts:', error, 'EmailAlerts')
    }
  }
  
  async sendSyncAlert(alert: SyncAlert) {
    // Use the new queue system for better reliability
    try {
      await queueAlertEmail(alert as AlertEmailData)
      logInfo(`Alert queued: ${alert.type}`, { type: alert.type }, 'EmailAlerts')
      return
    } catch (error) {
      logError('Failed to queue alert, falling back to direct send', error, 'EmailAlerts')
    }
    
    // Fallback to direct send if queue fails
    if (!this.isConfigured || !this.alertEmail) {
      logWarn('Email alerts not configured', null, 'EmailAlerts')
      return
    }
    
    try {
      let subject = ''
      let htmlContent = ''
      let textContent = ''
      
      switch (alert.type) {
        case 'failure':
          subject = '🚨 Finale Sync Failed'
          htmlContent = `
            <h2>Finale Sync Failure Alert</h2>
            <p><strong>Error:</strong> ${alert.error || 'Unknown error'}</p>
            ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${alert.details ? `
              <h3>Details:</h3>
              <pre>${JSON.stringify(alert.details, null, 2)}</pre>
            ` : ''}
            <hr>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/sync-status">View Sync Dashboard</a></p>
          `
          textContent = `Finale Sync Failed\n\nError: ${alert.error || 'Unknown error'}\nTime: ${new Date().toLocaleString()}`
          break
          
        case 'warning':
          subject = '⚠️ Finale Sync Completed with Warnings'
          htmlContent = `
            <h2>Finale Sync Warning</h2>
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
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/sync-status">View Sync Dashboard</a></p>
          `
          textContent = `Finale Sync Warning\n\nThe sync completed with issues.\nTime: ${new Date().toLocaleString()}`
          break
          
        case 'stuck':
          subject = '🔴 Finale Sync Appears Stuck'
          htmlContent = `
            <h2>Stuck Sync Alert</h2>
            <p>A sync has been running for over 30 minutes and may be stuck.</p>
            ${alert.syncId ? `<p><strong>Sync ID:</strong> ${alert.syncId}</p>` : ''}
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p>Please check the sync status and consider restarting if necessary.</p>
            <hr>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/sync-status">View Sync Dashboard</a></p>
          `
          textContent = `Stuck Sync Alert\n\nA sync has been running for over 30 minutes.\nTime: ${new Date().toLocaleString()}`
          break
          
        case 'success':
          // Only send success emails if there were previous failures
          const { data: recentFailure } = await supabase
            .from('sync_logs')
            .select('id')
            .eq('sync_type', 'finale_inventory')
            .eq('status', 'error')
            .order('synced_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (!recentFailure) return // Don't send success email if no recent failures
          
          subject = '✅ Finale Sync Recovered'
          htmlContent = `
            <h2>Finale Sync Success</h2>
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
          `
          textContent = `Finale Sync Recovered\n\nThe sync completed successfully.\nTime: ${new Date().toLocaleString()}`
          break
          
        case 'out-of-stock':
          subject = '🚨 Out of Stock Alert'
          htmlContent = `
            <h2>Out of Stock Alert</h2>
            <p><strong>${alert.count || 0} items</strong> are now out of stock!</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${alert.items && alert.items.length > 0 ? `
              <h3>Out of Stock Items:</h3>
              <table border="1" cellpadding="5" cellspacing="0">
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Reorder Point</th>
                  <th>Supplier</th>
                </tr>
                ${alert.items.slice(0, 20).map(item => `
                  <tr>
                    <td>${item.productSku || item.sku}</td>
                    <td>${item.productName || 'N/A'}</td>
                    <td>${item.reorderPoint || 0}</td>
                    <td>${item.primarySupplierName || 'N/A'}</td>
                  </tr>
                `).join('')}
              </table>
              ${alert.items.length > 20 ? `<p>... and ${alert.items.length - 20} more items</p>` : ''}
            ` : ''}
            <hr>
            <p><strong>Action Required:</strong> Please create purchase orders for these items.</p>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/inventory">View Inventory</a></p>
          `
          textContent = `Out of Stock Alert\n\n${alert.count || 0} items are out of stock.\nTime: ${new Date().toLocaleString()}\n\nPlease check the inventory system.`
          break
          
        case 'reorder-needed':
          subject = '📦 Reorder Alert - Low Stock Items'
          htmlContent = `
            <h2>Reorder Alert</h2>
            <p><strong>${alert.count || 0} items</strong> have fallen below their reorder point.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${alert.items && alert.items.length > 0 ? `
              <h3>Items Needing Reorder:</h3>
              <table border="1" cellpadding="5" cellspacing="0">
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Reorder Point</th>
                  <th>Reorder Qty</th>
                  <th>Supplier</th>
                </tr>
                ${alert.items.slice(0, 20).map(item => `
                  <tr>
                    <td>${item.productSku || item.sku}</td>
                    <td>${item.productName || 'N/A'}</td>
                    <td>${item.quantityOnHand || 0}</td>
                    <td>${item.reorderPoint || 0}</td>
                    <td>${item.reorderQuantity || 0}</td>
                    <td>${item.primarySupplierName || 'N/A'}</td>
                  </tr>
                `).join('')}
              </table>
              ${alert.items.length > 20 ? `<p>... and ${alert.items.length - 20} more items</p>` : ''}
            ` : ''}
            <hr>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-orders/new">Create Purchase Order</a></p>
          `
          textContent = `Reorder Alert\n\n${alert.count || 0} items need reordering.\nTime: ${new Date().toLocaleString()}\n\nPlease check the inventory system.`
          break
      }
      
      if (subject && htmlContent) {
        const msg = {
          to: this.alertEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@inventory-manager.com',
          subject,
          text: textContent,
          html: htmlContent
        }
        
        await sgMail.send(msg)
        // Log the alert
        await supabase
          .from('sync_logs')
          .insert({
            sync_type: 'email_alert',
            status: 'success',
            synced_at: new Date().toISOString(),
            metadata: {
              alertType: alert.type,
              syncId: alert.syncId,
              recipient: this.alertEmail
            }
          })
      }
    } catch (error) {
      logError('Failed to send alert email:', error, 'EmailAlerts')
      
      // Log the failed alert
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'email_alert',
          status: 'error',
          synced_at: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Failed to send email'],
          metadata: {
            alertType: alert.type,
            syncId: alert.syncId
          }
        })
    }
  }
  
  // Check for stuck syncs and send alerts
  async checkForStuckSyncs() {
    try {
      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
      
      const { data: stuckSyncs } = await supabase
        .from('sync_logs')
        .select('id, synced_at')
        .eq('sync_type', 'finale_inventory')
        .eq('status', 'running')
        .lt('synced_at', thirtyMinutesAgo.toISOString())
      
      if (stuckSyncs && stuckSyncs.length > 0) {
        for (const sync of stuckSyncs) {
          await this.sendSyncAlert({
            type: 'stuck',
            syncId: sync.id,
            details: {
              startedAt: sync.synced_at,
              runningFor: Math.round((Date.now() - new Date(sync.synced_at).getTime()) / 1000 / 60) + ' minutes'
            }
          })
        }
      }
    } catch (error) {
      logError('Error checking for stuck syncs:', error, 'EmailAlerts')
    }
  }
}

// Create singleton instance
export const emailAlerts = new EmailAlertService()