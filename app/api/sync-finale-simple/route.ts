import { NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Simple sync endpoint that uses the existing finale-api.ts
export async function POST(request: Request) {
  try {
    // Check if we have the basic Finale credentials
    const apiKey = process.env.FINALE_API_KEY
    const apiSecret = process.env.FINALE_API_SECRET
    const accountPath = process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        error: 'Finale API credentials not configured',
        setup: 'Set FINALE_API_KEY and FINALE_API_SECRET in Vercel environment variables'
      }, { status: 500 })
    }

    // Since Report URLs aren't configured, we'll use the direct API approach
    // This fetches data using the standard Finale API endpoints
    
    const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    
    const results = {
      inventory: { synced: 0, error: null as string | null },
      vendors: { synced: 0, error: null as string | null }
    }

    // Fetch inventory using the products endpoint
    try {
      const inventoryResponse = await fetch(`${baseUrl}/product`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      })

      if (inventoryResponse.ok) {
        const data = await inventoryResponse.json()
        const items = Array.isArray(data) ? data : data.productList || []
        
        if (items.length > 0) {
          // Store in Redis
          if (redis) {
            await redis.set('inventory:full', JSON.stringify(items), 'EX', 900)
            await redis.set('inventory:sync:timestamp', new Date().toISOString())
          }
          results.inventory.synced = items.length
        }
      } else {
        results.inventory.error = `HTTP ${inventoryResponse.status}`
      }
    } catch (error) {
      results.inventory.error = error instanceof Error ? error.message : 'Failed to fetch inventory'
    }

    // Fetch vendors using the supplier endpoint
    try {
      const vendorResponse = await fetch(`${baseUrl}/supplier`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      })

      if (vendorResponse.ok) {
        const data = await vendorResponse.json()
        const vendors = Array.isArray(data) ? data : data.supplierList || []
        
        if (vendors.length > 0) {
          // Store in Redis
          if (redis) {
            await redis.set('vendors:full', JSON.stringify(vendors), 'EX', 3600)
            await redis.set('vendors:sync:timestamp', new Date().toISOString())
          }
          results.vendors.synced = vendors.length
        }
      } else {
        results.vendors.error = `HTTP ${vendorResponse.status}`
      }
    } catch (error) {
      results.vendors.error = error instanceof Error ? error.message : 'Failed to fetch vendors'
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: 'Simple sync completed',
      results,
      timestamp: new Date().toISOString(),
      note: 'Using direct API endpoints instead of Report URLs'
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Sync failed',
      help: 'Check Finale API credentials in environment variables'
    }, { status: 500 })
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    const hasCredentials = !!(process.env.FINALE_API_KEY && process.env.FINALE_API_SECRET)
    
    let cacheStatus = {
      inventory: 0,
      vendors: 0,
      lastSync: null as string | null
    }

    if (redis) {
      const inventory = await redis.get('inventory:full')
      const vendors = await redis.get('vendors:full')
      const timestamp = await redis.get('inventory:sync:timestamp')
      
      cacheStatus = {
        inventory: inventory ? JSON.parse(inventory).length : 0,
        vendors: vendors ? JSON.parse(vendors).length : 0,
        lastSync: timestamp || null
      }
    }

    return NextResponse.json({
      status: 'ready',
      hasCredentials,
      cache: cacheStatus,
      endpoints: {
        sync: 'POST /api/sync-finale-simple',
        inventory: 'GET /api/inventory',
        vendors: 'GET /api/vendors'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Status check failed'
    }, { status: 500 })
  }
}