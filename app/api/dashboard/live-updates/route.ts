import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface LiveUpdate {
  timestamp: string
  type: 'inventory' | 'po' | 'sync' | 'alert'
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  details?: any
}

export const GET = createApiHandler(async ({ query }) => {
  try {
    const since = query.get('since') || new Date(Date.now() - 5 * 60 * 1000).toISOString() // Last 5 minutes by default
    
    const updates: LiveUpdate[] = []
    
    // Get recent sync activities
    const { data: syncLogs, error: syncError } = await supabase
      .from('sync_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!syncError && syncLogs) {
      for (const log of syncLogs) {
        updates.push({
          timestamp: log.created_at,
          type: 'sync',
          message: `Sync ${log.status}: ${log.sync_type}`,
          severity: log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'info',
          details: {
            items_synced: log.items_synced,
            duration: log.duration_seconds
          }
        })
      }
    }
    
    // Get recent PO updates
    const { data: recentPOs, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (!poError && recentPOs) {
      for (const po of recentPOs) {
        updates.push({
          timestamp: po.updated_at,
          type: 'po',
          message: `PO ${po.po_number} status: ${po.status}`,
          severity: 'info',
          details: {
            vendor_id: po.vendor_id,
            total_amount: po.total_amount
          }
        })
      }
    }
    
    // Check for critical inventory alerts
    const { data: criticalItems, error: criticalError } = await supabase
      .from('inventory_items')
      .select('sku, product_title, available_quantity, sales_velocity_30_day')
      .gt('sales_velocity_30_day', 0)
      .lt('available_quantity', 10)
      .limit(5)
    
    if (!criticalError && criticalItems) {
      for (const item of criticalItems) {
        const daysStock = item.sales_velocity_30_day > 0 
          ? item.available_quantity / item.sales_velocity_30_day 
          : 999
          
        if (daysStock <= 3) {
          updates.push({
            timestamp: new Date().toISOString(),
            type: 'alert',
            message: `Critical stock alert: ${item.sku}`,
            severity: 'error',
            details: {
              product_title: item.product_title,
              available: item.available_quantity,
              days_remaining: Math.round(daysStock * 10) / 10
            }
          })
        }
      }
    }
    
    // Get inventory updates (items with recent changes)
    const { data: inventoryUpdates, error: invError } = await supabase
      .from('inventory_items')
      .select('sku, product_title, available_quantity, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (!invError && inventoryUpdates) {
      for (const item of inventoryUpdates) {
        updates.push({
          timestamp: item.updated_at,
          type: 'inventory',
          message: `Inventory updated: ${item.sku}`,
          severity: 'info',
          details: {
            product_title: item.product_title,
            new_quantity: item.available_quantity
          }
        })
      }
    }
    
    // Sort all updates by timestamp
    updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Add summary stats
    const stats = {
      totalUpdates: updates.length,
      byType: {
        inventory: updates.filter(u => u.type === 'inventory').length,
        po: updates.filter(u => u.type === 'po').length,
        sync: updates.filter(u => u.type === 'sync').length,
        alert: updates.filter(u => u.type === 'alert').length
      },
      bySeverity: {
        info: updates.filter(u => u.severity === 'info').length,
        warning: updates.filter(u => u.severity === 'warning').length,
        error: updates.filter(u => u.severity === 'error').length,
        success: updates.filter(u => u.severity === 'success').length
      }
    }
    
    return apiResponse({
      updates: updates.slice(0, 20), // Limit to 20 most recent
      stats,
      since,
      currentTime: new Date().toISOString()
    })

  } catch (error) {
    console.error('Live updates error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch live updates'))
  }
})