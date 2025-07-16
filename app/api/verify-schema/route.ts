import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET() {
  try {
    const verificationResults = {
      success: true,
      tables: {
        inventory_items: { exists: false, fields: {} },
        settings: { exists: false, fields: {} },
        purchase_orders: { exists: false, fields: {} },
        vendors: { exists: false, fields: {} },
        sync_logs: { exists: false }
      },
      errors: [] as string[]
    }

    // Test inventory_items table
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_items')
        .select('cost, sales_last_30_days, sales_last_90_days, last_sales_update')
        .limit(1)

      if (!error) {
        verificationResults.tables.inventory_items.exists = true
        verificationResults.tables.inventory_items.fields = {
          cost: true,
          sales_last_30_days: true,
          sales_last_90_days: true,
          last_sales_update: true
        }
      } else {
        verificationResults.errors.push(`inventory_items: ${error.message}`)
      }
    } catch (e) {
      verificationResults.errors.push('inventory_items table check failed')
    }

    // Test settings table
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('sync_frequency_minutes, last_sync_time, sync_enabled')
        .limit(1)

      if (!error) {
        verificationResults.tables.settings.exists = true
        verificationResults.tables.settings.fields = {
          sync_frequency_minutes: true,
          last_sync_time: true,
          sync_enabled: true
        }
      } else {
        verificationResults.errors.push(`settings: ${error.message}`)
      }
    } catch (e) {
      verificationResults.errors.push('settings table check failed')
    }

    // Test purchase_orders table
    try {
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .select('finale_order_id, finale_sync_status, finale_last_sync')
        .limit(1)

      if (!error) {
        verificationResults.tables.purchase_orders.exists = true
        verificationResults.tables.purchase_orders.fields = {
          finale_order_id: true,
          finale_sync_status: true,
          finale_last_sync: true
        }
      } else {
        verificationResults.errors.push(`purchase_orders: ${error.message}`)
      }
    } catch (e) {
      verificationResults.errors.push('purchase_orders table check failed')
    }

    // Test vendors table
    try {
      const { data: vendors, error } = await supabase
        .from('vendors')
        .select('finale_vendor_id')
        .limit(1)

      if (!error) {
        verificationResults.tables.vendors.exists = true
        verificationResults.tables.vendors.fields = {
          finale_vendor_id: true
        }
      } else {
        verificationResults.errors.push(`vendors: ${error.message}`)
      }
    } catch (e) {
      verificationResults.errors.push('vendors table check failed')
    }

    // Test sync_logs table
    try {
      const { data: logs, error } = await supabase
        .from('sync_logs')
        .select('*')
        .limit(1)

      if (!error) {
        verificationResults.tables.sync_logs.exists = true
      } else {
        verificationResults.errors.push(`sync_logs: ${error.message}`)
      }
    } catch (e) {
      verificationResults.errors.push('sync_logs table check failed')
    }

    // Determine overall success
    verificationResults.success = verificationResults.errors.length === 0

    return NextResponse.json({
      ...verificationResults,
      message: verificationResults.success 
        ? '✅ All database migrations verified successfully!' 
        : '⚠️ Some migrations may be missing or incomplete',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Verification failed',
      message: '❌ Failed to verify database schema'
    }, { status: 500 })
  }
}