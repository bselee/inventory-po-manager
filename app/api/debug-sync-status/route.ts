import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    // 1. Check database counts
    const { data: inventoryCount } = await supabase
      .from('inventory_items')
      .select('count', { count: 'exact' })
    
    const { data: vendorCount } = await supabase
      .from('vendors')
      .select('count', { count: 'exact' })
    
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    // 2. Check Finale config
    const config = await getFinaleConfig()
    
    // 3. Test Finale connection and get sample data
    let finaleStatus = {
      connected: false,
      sampleProducts: [],
      sampleVendors: [],
      error: null as string | null
    }
    
    if (config) {
      try {
        const finaleApi = new FinaleApiService(config)
        
        // Test connection
        finaleStatus.connected = await finaleApi.testConnection()
        
        if (finaleStatus.connected) {
          // Get sample products
          const products = await finaleApi.getInventoryData(new Date().getFullYear())
          finaleStatus.sampleProducts = products.slice(0, 3).map(p => ({
            sku: p.productSku,
            name: p.productName,
            stock: p.quantityOnHand
          }))
          
          // Get sample vendors
          const vendors = await finaleApi.getVendors()
          finaleStatus.sampleVendors = vendors.slice(0, 3).map(v => ({
            id: v.vendorId,
            name: v.vendorName
          }))
        }
      } catch (error) {
        finaleStatus.error = error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // 4. Check last sync times
    const { data: lastInventorySync } = await supabase
      .from('inventory_items')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()
    
    const { data: lastVendorSync } = await supabase
      .from('vendors')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()
    
    return apiResponse({
      database: {
        inventoryCount: inventoryCount || 0,
        vendorCount: vendorCount || 0,
        lastInventorySync: lastInventorySync?.last_updated || null,
        lastVendorSync: lastVendorSync?.last_updated || null
      },
      finale: {
        configured: !!config,
        ...finaleStatus
      },
      recentSyncLogs: syncLogs || [],
      recommendations: [
        (!config && "Finale API not configured - check settings"),
        (config && !finaleStatus.connected && "Finale connection failed - check credentials"),
        (finaleStatus.connected && inventoryCount === 0 && "No inventory in database - run inventory sync"),
        (finaleStatus.connected && vendorCount === 0 && "No vendors in database - run vendor sync"),
        (finaleStatus.connected && finaleStatus.sampleProducts.length > 0 && inventoryCount === 0 && "Finale has products but database is empty - sync not saving data")
      ].filter(Boolean)
    })
  } catch (error) {
    return apiResponse({
      error: 'Failed to check sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})