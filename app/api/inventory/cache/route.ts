import { NextRequest, NextResponse } from 'next/server';
import { finaleCacheService } from '@/app/lib/finale-cache-service';
import { logError } from '@/app/lib/logger';

// Required exports for Vercel deployment
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const ttlMinutes = parseInt(searchParams.get('ttl') || '15');
    const vendor = searchParams.get('vendor');
    const search = searchParams.get('search');
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    // Handle different request types
    if (lowStockOnly) {
      const lowStockItems = await finaleCacheService.getLowStockItems();
      return NextResponse.json({
        success: true,
        data: lowStockItems,
        count: lowStockItems.length,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    if (vendor) {
      const vendorItems = await finaleCacheService.getInventoryByVendor(vendor);
      return NextResponse.json({
        success: true,
        data: vendorItems,
        count: vendorItems.length,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    if (search) {
      const maxResults = parseInt(searchParams.get('limit') || '100');
      const searchResults = await finaleCacheService.searchInventory(search, { maxResults });
      return NextResponse.json({
        success: true,
        data: searchResults,
        count: searchResults.length,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // Default: get all inventory
    const inventory = await finaleCacheService.getInventoryData({
      forceRefresh,
      ttlMinutes
    });

    // Get cache metrics for response headers
    const metrics = await finaleCacheService.getCacheMetrics();

    return NextResponse.json({
      success: true,
      data: inventory,
      count: inventory.length,
      source: forceRefresh ? 'api' : 'cache',
      timestamp: new Date().toISOString(),
      cacheAge: metrics.cacheAge,
      metrics: {
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        totalItems: metrics.totalItems
      }
    }, {
      headers: {
        'Cache-Control': forceRefresh ? 'no-cache' : `max-age=${ttlMinutes * 60}`,
        'X-Cache-Status': forceRefresh ? 'MISS' : 'HIT',
        'X-Cache-Age': metrics.cacheAge || 'unknown'
      }
    });

  } catch (error) {
    logError('[Cache API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'X-Cache-Status': 'ERROR'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'clearCache':
        await finaleCacheService.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        });

      case 'warmUpCache':
        await finaleCacheService.warmUpCache();
        const metrics = await finaleCacheService.getCacheMetrics();
        return NextResponse.json({
          success: true,
          message: 'Cache warmed up successfully',
          metrics,
          timestamp: new Date().toISOString()
        });

      case 'healthCheck':
        const health = await finaleCacheService.healthCheck();
        return NextResponse.json({
          success: true,
          health,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: ['clearCache', 'warmUpCache', 'healthCheck']
        }, { status: 400 });
    }

  } catch (error) {
    logError('[Cache API] POST Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
