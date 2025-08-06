import { NextRequest, NextResponse } from 'next/server'
import { CachedDataFetcher, CacheMonitor, CacheInvalidator } from '@/app/lib/cache/caching-strategy'
import { inventoryFilterSchema } from '@/app/lib/validation-schemas'
import { withRateLimit } from '@/app/lib/rate-limiter'
import { logError } from '@/app/lib/monitoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/inventory-cached
 * Fetch inventory with intelligent caching
 */
export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      const searchParams = request.nextUrl.searchParams
      
      // Parse and validate filters
      const filters = {
        status: searchParams.get('status') || undefined,
        vendor: searchParams.get('vendor') || undefined,
        location: searchParams.get('location') || undefined,
        search: searchParams.get('search') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '100'),
        sortBy: searchParams.get('sortBy') || 'sku',
        sortDirection: (searchParams.get('sortDirection') || 'asc') as 'asc' | 'desc'
      }
      
      // Validate filters
      const validated = inventoryFilterSchema.safeParse(filters)
      if (!validated.success) {
        return NextResponse.json(
          { error: 'Invalid filter parameters', details: validated.error.issues },
          { status: 400 }
        )
      }
      
      // Fetch with caching
      const result = await CachedDataFetcher.getInventory(
        validated.data,
        validated.data.page || 1,
        validated.data.limit || 100
      )
      
      // Get cache metrics
      const cacheMetrics = CacheMonitor.getMetrics()
      
      return NextResponse.json({
        data: result,
        cache: {
          metrics: cacheMetrics,
          served_from: 'cache_or_db'
        }
      })
    } catch (error) {
      logError('Error fetching cached inventory:', error)
      CacheMonitor.recordError()
      
      return NextResponse.json(
        { error: 'Failed to fetch inventory' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/inventory-cached/invalidate
 * Invalidate inventory caches
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      const body = await request.json()
      const { type = 'inventory', itemId, sku } = body
      
      switch (type) {
        case 'inventory':
          await CacheInvalidator.invalidateInventory(itemId, sku)
          break
        case 'vendor':
          await CacheInvalidator.invalidateVendor(body.vendorId)
          break
        case 'all':
          await CacheInvalidator.invalidateAll()
          break
        default:
          return NextResponse.json(
            { error: 'Invalid invalidation type' },
            { status: 400 }
          )
      }
      
      return NextResponse.json({
        success: true,
        message: `Cache invalidated for ${type}`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logError('Error invalidating cache:', error)
      return NextResponse.json(
        { error: 'Failed to invalidate cache' },
        { status: 500 }
      )
    }
  })
}