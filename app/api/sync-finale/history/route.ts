import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // success, error, partial, running
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Build query
    let query = supabase
      .from('sync_logs')
      .select('*', { count: 'exact' })
      .eq('sync_type', 'finale_inventory')
      .order('synced_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (startDate) {
      query = query.gte('synced_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('synced_at', endDate)
    }
    
    const { data: syncHistory, error, count } = await query
    
    if (error) throw error
    
    // Process sync history to add calculated fields
    const processedHistory = syncHistory?.map(sync => ({
      ...sync,
      duration: sync.duration_ms ? `${(sync.duration_ms / 1000).toFixed(1)}s` : 'N/A',
      successRate: sync.items_processed > 0 
        ? Math.round(((sync.items_updated || 0) / sync.items_processed) * 100)
        : 0,
      hasErrors: (sync.errors?.length || 0) > 0,
      errorCount: sync.errors?.length || 0,
      itemsFailed: sync.metadata?.itemsFailed || 
        (sync.items_processed && sync.items_updated 
          ? sync.items_processed - sync.items_updated 
          : 0)
    }))
    
    // Calculate aggregate statistics
    const stats = {
      totalSyncs: count || 0,
      avgDuration: syncHistory?.length 
        ? Math.round(syncHistory.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / syncHistory.length / 1000)
        : 0,
      avgItemsProcessed: syncHistory?.length
        ? Math.round(syncHistory.reduce((sum, s) => sum + (s.items_processed || 0), 0) / syncHistory.length)
        : 0,
      totalErrors: syncHistory?.reduce((sum, s) => sum + (s.errors?.length || 0), 0) || 0
    }
    
    return NextResponse.json({
      history: processedHistory || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      statistics: stats
    })
  } catch (error) {
    logError('Error fetching sync history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    )
  }
}