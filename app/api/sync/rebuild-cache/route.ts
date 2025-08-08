import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis-client'
import { logError, logInfo } from '@/app/lib/logger'
import { getFinaleConfig, FinaleApiService } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for Finale API calls

interface InventoryItem {
  sku: string
  product_name: string
  vendor: string | null
  current_stock: number
  cost: number
  location: string
  reorder_point?: number
  sales_velocity?: number
  days_until_stockout?: number
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  last_updated: string
  finale_id?: string
}

interface VendorItem {
  id: string
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = request.headers.get('x-api-key')
  const token = request.headers.get('x-access-token')
  
  // Check for API key in header
  if (apiKey && process.env.CACHE_REBUILD_API_KEY) {
    return apiKey === process.env.CACHE_REBUILD_API_KEY
  }
  
  // Check for JWT secret in header (simple auth)
  if (token && process.env.JWT_SECRET) {
    return token === process.env.JWT_SECRET
  }
  
  // Check for basic auth with finale credentials
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6)
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    return (
      username === process.env.FINALE_API_KEY &&
      password === process.env.FINALE_API_SECRET
    )
  }
  
  return false
}

// Calculate stock status level
function calculateStockStatus(
  stock: number,
  reorderPoint: number,
  daysUntilStockout?: number
): 'critical' | 'low' | 'adequate' | 'overstocked' {
  if (stock === 0) return 'critical'
  if (daysUntilStockout && daysUntilStockout <= 7) return 'critical'
  if (stock <= reorderPoint || (daysUntilStockout && daysUntilStockout <= 30)) return 'low'
  if (daysUntilStockout && daysUntilStockout > 180) return 'overstocked'
  return 'adequate'
}

// Fetch inventory data from Finale API
async function fetchInventoryData(finaleApi: FinaleApiService): Promise<any[]> {
  logInfo('[Cache Rebuild] Fetching inventory from Finale API...')
  
  try {
    // Use the existing getAllProducts method which gets comprehensive data
    const products = await finaleApi.getAllProducts()
    logInfo(`[Cache Rebuild] Retrieved ${products.length} products from Finale API`)
    return products
  } catch (error) {
    logError('[Cache Rebuild] Error fetching from Finale API:', error)
    throw error
  }
}

// Fetch vendor data from Finale API
async function fetchVendorData(finaleApi: FinaleApiService): Promise<any[]> {
  logInfo('[Cache Rebuild] Fetching vendors from Finale API...')
  
  try {
    const vendors = await finaleApi.getVendors()
    logInfo(`[Cache Rebuild] Retrieved ${vendors.length} vendors from Finale API`)
    return vendors
  } catch (error) {
    logError('[Cache Rebuild] Error fetching vendors from Finale API:', error)
    throw error
  }
}

// Transform inventory data from Finale API format to cache format
function transformInventoryData(data: any[]): InventoryItem[] {
  return data.map((item: any) => {
    const stock = Number(item.quantityOnHand || item.quantityAvailable || 0)
    const reorderPoint = Number(item.reorderPoint || 0)
    
    return {
      sku: String(item.itemSKU || item.sku || ''),
      product_name: String(item.itemName || item.productName || ''),
      vendor: item.supplier || null,
      current_stock: stock,
      cost: Number(item.unitPrice || 0),
      location: item.location || 'Main',
      reorder_point: reorderPoint,
      sales_velocity: 0, // Would need sales data to calculate
      days_until_stockout: undefined,
      stock_status_level: calculateStockStatus(stock, reorderPoint),
      last_updated: new Date().toISOString(),
      finale_id: String(item.itemID || item.productId || '')
    }
  })
}

// Transform vendor data to consistent format
function transformVendorData(data: any[]): VendorItem[] {
  return data.map((item: any) => ({
    id: String(item.vendorId || item.id || item.partyId || ''),
    name: String(item.vendorName || item.name || item.partyName || ''),
    contact_name: item.contactName || item.contact || null,
    email: item.email || null,
    phone: item.phone || item.telephone || null,
    address: item.address || item.billingAddress || null,
    notes: item.notes || item.comments || null,
    active: item.active !== false, // Default to true unless explicitly false
    created_at: item.createdDate || item.created_at || new Date().toISOString(),
    updated_at: item.lastModifiedDate || item.updated_at || new Date().toISOString()
  }))
}

// POST /api/sync/rebuild-cache - Rebuild Redis cache from Finale reports
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Authentication check
    if (!isAuthenticated(request)) {
      logError('[Cache Rebuild] Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })
      return NextResponse.json(
        { error: 'Unauthorized. Provide x-api-key, x-access-token, or Basic auth.' },
        { status: 401 }
      )
    }
    
    // Get Finale configuration
    const finaleConfig = await getFinaleConfig()
    if (!finaleConfig) {
      return NextResponse.json(
        { error: 'Finale API credentials not configured' },
        { status: 500 }
      )
    }
    
    // Initialize Finale API service
    const finaleApi = new FinaleApiService(finaleConfig)
    
    logInfo('[Cache Rebuild] Starting cache rebuild process')
    
    let inventoryData: InventoryItem[] = []
    let vendorData: VendorItem[] = []
    let inventoryError: string | null = null
    let vendorError: string | null = null
    
    // Fetch inventory data from Finale API (with timeout)
    try {
      const inventoryPromise = Promise.race([
        fetchInventoryData(finaleApi),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Inventory fetch timeout after 120 seconds')), 120000)
        )
      ]) as Promise<any[]>
      
      const rawInventoryData = await inventoryPromise
      inventoryData = transformInventoryData(rawInventoryData)
      logInfo(`[Cache Rebuild] Transformed ${inventoryData.length} inventory items`)
    } catch (error) {
      inventoryError = error instanceof Error ? error.message : 'Unknown inventory fetch error'
      logError('[Cache Rebuild] Inventory fetch failed:', error)
    }
    
    // Fetch vendor data from Finale API (with timeout)
    try {
      const vendorPromise = Promise.race([
        fetchVendorData(finaleApi),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Vendor fetch timeout after 60 seconds')), 60000)
        )
      ]) as Promise<any[]>
      
      const rawVendorData = await vendorPromise
      vendorData = transformVendorData(rawVendorData)
      logInfo(`[Cache Rebuild] Transformed ${vendorData.length} vendor items`)
    } catch (error) {
      vendorError = error instanceof Error ? error.message : 'Unknown vendor fetch error'
      logError('[Cache Rebuild] Vendor fetch failed (continuing without vendor data):', error)
    }
    
    // If inventory fetch failed, return error
    if (inventoryError && inventoryData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch inventory data',
          details: { inventoryError, vendorError }
        },
        { status: 500 }
      )
    }
    
    // Store in Redis with proper TTLs
    const cacheOperations: Promise<void>[] = []
    
    // Store inventory data
    if (inventoryData.length > 0) {
      cacheOperations.push(
        redis.setex('inventory:full', 900, inventoryData) // 15 minutes TTL
      )
      logInfo(`[Cache Rebuild] Caching ${inventoryData.length} inventory items`)
    }
    
    // Store vendor data
    if (vendorData.length > 0) {
      cacheOperations.push(
        redis.setex('vendors:full', 3600, vendorData) // 1 hour TTL
      )
      logInfo(`[Cache Rebuild] Caching ${vendorData.length} vendor items`)
    }
    
    // Store cache metadata
    const cacheMetadata = {
      last_rebuilt: new Date().toISOString(),
      inventory_count: inventoryData.length,
      vendor_count: vendorData.length,
      duration_ms: Date.now() - startTime,
      errors: [inventoryError, vendorError].filter(Boolean)
    }
    
    cacheOperations.push(
      redis.setex('cache:rebuild:metadata', 3600, cacheMetadata)
    )
    
    // Execute all cache operations
    await Promise.all(cacheOperations)
    
    const duration = Date.now() - startTime
    logInfo(`[Cache Rebuild] Cache rebuild completed in ${duration}ms`, {
      inventoryItems: inventoryData.length,
      vendorItems: vendorData.length,
      hasErrors: !!(inventoryError || vendorError)
    })
    
    return NextResponse.json({
      success: true,
      message: 'Cache rebuild completed successfully',
      data: {
        inventory_items: inventoryData.length,
        vendor_items: vendorData.length,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        errors: [inventoryError, vendorError].filter(Boolean)
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('[Cache Rebuild] Unexpected error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Cache rebuild failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}

// GET /api/sync/rebuild-cache - Get cache rebuild status
export async function GET() {
  try {
    const metadata = await redis.get('cache:rebuild:metadata')
    
    if (!metadata) {
      return NextResponse.json({
        status: 'no_data',
        message: 'No cache rebuild data found'
      })
    }
    
    return NextResponse.json({
      status: 'success',
      ...metadata
    })
    
  } catch (error) {
    logError('[Cache Rebuild] Error getting status:', error)
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    )
  }
}