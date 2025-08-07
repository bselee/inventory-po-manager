import { NextRequest, NextResponse } from 'next/server'
import { kvVendorsService } from '@/app/lib/kv-vendors-service'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'
import { logError } from '@/app/lib/logger'

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
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    // Get vendors from Redis/Finale
    const vendors = await kvVendorsService.getVendors(forceRefresh)
    
    // Get inventory for vendor stats
    const inventory = await kvInventoryService.getInventory(forceRefresh)
    
    // Add statistics to each vendor
    const vendorsWithStats = vendors.map(vendor => {
      // Calculate stats from inventory
      const vendorItems = inventory.filter(item => 
        item.vendor === vendor.name || 
        item.vendor === vendor.id
      )
      
      const totalItems = vendorItems.length
      const totalValue = vendorItems.reduce((sum, item) => 
        sum + ((item.current_stock || 0) * (item.cost || 0)), 0
      )
      const outOfStockItems = vendorItems.filter(item => item.current_stock === 0).length
      const lowStockItems = vendorItems.filter(item => 
        item.stock_status_level === 'low' || item.stock_status_level === 'critical'
      ).length
      
      return {
        ...vendor,
        totalItems,
        totalValue,
        outOfStockItems,
        lowStockItems
      }
    })
    
    return NextResponse.json({ 
      data: vendorsWithStats,
      source: 'redis-finale',
      totalCount: vendorsWithStats.length
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