import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis-client'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  
  // For testing, allow if any auth header is present
  return !!(authHeader || apiKey || token)
}

// Generate mock inventory data
function generateMockInventoryData(): InventoryItem[] {
  const mockData: InventoryItem[] = [
    {
      sku: 'TEST-001',
      product_name: 'Test Product 1',
      vendor: 'Test Vendor A',
      current_stock: 50,
      cost: 10.99,
      location: 'Shipping',
      reorder_point: 20,
      sales_velocity: 2.5,
      stock_status_level: 'adequate',
      last_updated: new Date().toISOString(),
      finale_id: 'test-finale-001'
    },
    {
      sku: 'TEST-002', 
      product_name: 'Test Product 2',
      vendor: 'Test Vendor B',
      current_stock: 5,
      cost: 25.50,
      location: 'Shipping',
      reorder_point: 15,
      sales_velocity: 1.0,
      stock_status_level: 'critical',
      last_updated: new Date().toISOString(),
      finale_id: 'test-finale-002'
    },
    {
      sku: 'TEST-003',
      product_name: 'Test Product 3',
      vendor: 'Test Vendor A',
      current_stock: 100,
      cost: 5.25,
      location: 'Shipping',
      reorder_point: 30,
      sales_velocity: 0.5,
      stock_status_level: 'overstocked',
      last_updated: new Date().toISOString(),
      finale_id: 'test-finale-003'
    }
  ]
  
  return mockData
}

// Generate mock vendor data
function generateMockVendorData(): VendorItem[] {
  const mockData: VendorItem[] = [
    {
      id: 'vendor-001',
      name: 'Test Vendor A',
      contact_name: 'John Smith',
      email: 'john@testvendora.com',
      phone: '555-0001',
      address: '123 Main St, Test City, TC 12345',
      notes: 'Primary supplier for test products',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'vendor-002',
      name: 'Test Vendor B',
      contact_name: 'Jane Doe',
      email: 'jane@testvendorb.com',
      phone: '555-0002',
      address: '456 Oak Ave, Test Town, TT 67890',
      notes: 'Secondary supplier',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
  
  return mockData
}

// POST /api/sync/rebuild-cache/test - Test cache rebuild with mock data
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Simple authentication check
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide any auth header for testing.' },
        { status: 401 }
      )
    }
    
    logInfo('[Cache Rebuild Test] Starting cache rebuild test with mock data')
    
    // Generate mock data
    const inventoryData = generateMockInventoryData()
    const vendorData = generateMockVendorData()
    
    logInfo(`[Cache Rebuild Test] Generated ${inventoryData.length} inventory items and ${vendorData.length} vendors`)
    
    // Store in Redis with proper TTLs
    const cacheOperations: Promise<void>[] = []
    
    // Store inventory data
    cacheOperations.push(
      redis.setex('inventory:full', 900, inventoryData) // 15 minutes TTL
    )
    
    // Store vendor data
    cacheOperations.push(
      redis.setex('vendors:full', 3600, vendorData) // 1 hour TTL
    )
    
    // Store cache metadata
    const cacheMetadata = {
      last_rebuilt: new Date().toISOString(),
      inventory_count: inventoryData.length,
      vendor_count: vendorData.length,
      duration_ms: Date.now() - startTime,
      test_mode: true,
      errors: []
    }
    
    cacheOperations.push(
      redis.setex('cache:rebuild:metadata', 3600, cacheMetadata)
    )
    
    // Execute all cache operations
    await Promise.all(cacheOperations)
    
    const duration = Date.now() - startTime
    logInfo(`[Cache Rebuild Test] Cache rebuild test completed in ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      message: 'Cache rebuild test completed successfully with mock data',
      data: {
        inventory_items: inventoryData.length,
        vendor_items: vendorData.length,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        test_mode: true,
        sample_inventory: inventoryData.slice(0, 2),
        sample_vendors: vendorData.slice(0, 1)
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('[Cache Rebuild Test] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Cache rebuild test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}

// GET /api/sync/rebuild-cache/test - Get test cache data
export async function GET() {
  try {
    const [inventoryData, vendorData, metadata] = await Promise.all([
      redis.get('inventory:full'),
      redis.get('vendors:full'),
      redis.get('cache:rebuild:metadata')
    ])
    
    return NextResponse.json({
      status: 'success',
      cache_data: {
        has_inventory: !!inventoryData,
        has_vendors: !!vendorData,
        inventory_count: inventoryData ? inventoryData.length : 0,
        vendor_count: vendorData ? vendorData.length : 0,
        metadata: metadata || null,
        sample_inventory: inventoryData ? inventoryData.slice(0, 2) : [],
        sample_vendors: vendorData ? vendorData.slice(0, 1) : []
      }
    })
    
  } catch (error) {
    logError('[Cache Rebuild Test] Error getting test data:', error)
    return NextResponse.json(
      { error: 'Failed to get test cache data' },
      { status: 500 }
    )
  }
}