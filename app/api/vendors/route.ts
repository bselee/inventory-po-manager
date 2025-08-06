import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/lib/finale-api'
import { supabase } from '@/lib/supabase'
import { kvInventoryService } from '@/lib/kv-inventory-service'
import { getSettings } from '@/lib/data-access'
import { createApiHandler, apiResponse } from '@/lib/api-handler'
import { vendorSchema, paginationSchema } from '@/lib/validation-schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Type definitions for vendor statistics
interface VendorStats {
  id: string
  name: string
  active: boolean
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
}

// Get all vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const useCache = searchParams.get('useCache') !== 'false'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    // Check if we should use cache
    const settings = await getSettings()
    const shouldUseCache = useCache && settings?.inventory_data_source === 'redis-cache'
    
    if (shouldUseCache) {
      // Get vendors from inventory cache
      const vendors = await kvInventoryService.getVendors()
      const inventory = await kvInventoryService.getInventory(forceRefresh)
      
      // Create vendor objects with stats from cached inventory
      const vendorMap = new Map<string, VendorStats>()
      
      inventory.forEach(item => {
        if (item.vendor) {
          if (!vendorMap.has(item.vendor)) {
            vendorMap.set(item.vendor, {
              id: item.vendor.toLowerCase().replace(/\s+/g, '-'),
              name: item.vendor,
              active: true,
              totalItems: 0,
              totalValue: 0,
              lowStockItems: 0,
              outOfStockItems: 0
            })
          }
          
          const vendor = vendorMap.get(item.vendor)
          if (vendor) {
            vendor.totalItems++
            vendor.totalValue += (item.current_stock || 0) * (item.cost || 0)
            
            if (item.current_stock === 0) {
              vendor.outOfStockItems++
            } else if (item.stock_status_level === 'low' || item.stock_status_level === 'critical') {
              vendor.lowStockItems++
            }
          }
        }
      })
      
      const vendorData = Array.from(vendorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      
      return NextResponse.json({ 
        data: vendorData,
        source: 'cache',
        totalCount: vendorData.length
      })
    }
    
    // Fallback to database
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      logError('Error fetching vendors:', error)
      return NextResponse.json(
        { error: 'Failed to fetch vendors' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: data || [],
      source: 'database',
      totalCount: data?.length || 0
    })
  } catch (error) {
    logError('Error in GET /api/vendors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new vendor (sync to Finale)
export async function POST(request: NextRequest) {
  try {
    const vendor = await request.json()
    
    // Get Finale config to create in Finale first
    const config = await getFinaleConfig()
    let finaleVendorId = null
    
    if (config) {
      try {
        const finaleApi = new FinaleApiService(config)
        const finaleResponse = await finaleApi.createVendor(vendor)
        
        // Extract the vendor ID from the response
        finaleVendorId = finaleResponse.vendorId || finaleResponse.id
      } catch (finaleError) {
        logError('Failed to create vendor in Finale:', finaleError)
        // Continue to create locally even if Finale fails
      }
    }
    
    // Create in our database
    const { data: newVendor, error: dbError } = await supabase
      .from('vendors')
      .insert({
        name: vendor.name,
        finale_vendor_id: finaleVendorId,
        contact_name: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        // Remove notes and other fields that might not exist
        active: true
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({
      ...newVendor,
      syncStatus: finaleVendorId ? 'synced' : 'local-only'
    })
  } catch (error) {
    logError('Error creating vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create vendor' },
      { status: 500 }
    )
  }
}