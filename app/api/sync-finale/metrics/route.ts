import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    const hourly = searchParams.get('hourly') === 'true'
    
    // Get metrics from the database function
    const { data: dbMetrics, error: metricsError } = await supabase
      .rpc('get_sync_metrics', { days_back: days })
    
    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
    }
    
    // Get hourly breakdown if requested
    let hourlyBreakdown = null
    if (hourly) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data: hourlyData } = await supabase
        .from('sync_logs')
        .select('synced_at, status, items_processed, duration_ms')
        .eq('sync_type', 'finale_inventory')
        .gte('synced_at', startDate.toISOString())
        .order('synced_at', { ascending: true })
      
      if (hourlyData) {
        // Group by hour
        const hourlyMap = new Map<string, any>()
        
        hourlyData.forEach(sync => {
          const hour = new Date(sync.synced_at).toISOString().slice(0, 13) + ':00:00'
          
          if (!hourlyMap.has(hour)) {
            hourlyMap.set(hour, {
              hour,
              syncs: 0,
              successful: 0,
              failed: 0,
              itemsProcessed: 0,
              avgDuration: 0,
              durations: []
            })
          }
          
          const hourData = hourlyMap.get(hour)
          hourData.syncs++
          if (sync.status === 'success') hourData.successful++
          if (sync.status === 'error') hourData.failed++
          hourData.itemsProcessed += sync.items_processed || 0
          if (sync.duration_ms) hourData.durations.push(sync.duration_ms)
        })
        
        // Calculate averages
        hourlyBreakdown = Array.from(hourlyMap.values()).map(hour => {
          if (hour.durations.length > 0) {
            hour.avgDuration = Math.round(
              hour.durations.reduce((a: number, b: number) => a + b, 0) / hour.durations.length
            )
          }
          delete hour.durations
          return hour
        })
      }
    }
    
    // Get error patterns
    const { data: errorPatterns } = await supabase
      .from('sync_logs')
      .select('errors')
      .eq('sync_type', 'finale_inventory')
      .not('errors', 'is', null)
      .gte('synced_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .limit(100)
    
    // Analyze error patterns
    const errorCounts = new Map<string, number>()
    errorPatterns?.forEach(log => {
      log.errors?.forEach((error: string) => {
        // Extract error type (first part of error message)
        const errorType = error.split(':')[0].trim()
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1)
      })
    })
    
    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }))
    
    // Get sync frequency analysis
    const { data: syncTimes } = await supabase
      .from('sync_logs')
      .select('synced_at')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(20)
    
    let avgTimeBetweenSyncs = null
    if (syncTimes && syncTimes.length > 1) {
      const intervals = []
      for (let i = 1; i < syncTimes.length; i++) {
        const interval = new Date(syncTimes[i-1].synced_at).getTime() - 
                        new Date(syncTimes[i].synced_at).getTime()
        intervals.push(interval)
      }
      avgTimeBetweenSyncs = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length / 1000 / 60
      ) // in minutes
    }
    
    // Performance trends
    const { data: performanceTrend } = await supabase
      .from('sync_logs')
      .select('synced_at, duration_ms, items_processed')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'success')
      .gte('synced_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('synced_at', { ascending: true })
    
    let itemsPerSecondTrend = null
    if (performanceTrend) {
      itemsPerSecondTrend = performanceTrend
        .filter(sync => sync.duration_ms && sync.items_processed)
        .map(sync => ({
          date: sync.synced_at,
          itemsPerSecond: Math.round((sync.items_processed / (sync.duration_ms / 1000)) * 10) / 10
        }))
    }
    
    // Format the response
    const metrics = {
      period: `Last ${days} days`,
      summary: dbMetrics?.reduce((acc: any, metric: any) => {
        acc[metric.metric_name] = {
          value: metric.metric_value,
          details: metric.metric_detail
        }
        return acc
      }, {}) || {},
      errorAnalysis: {
        totalErrors: errorPatterns?.length || 0,
        topErrors,
        errorRate: dbMetrics?.find((m: any) => m.metric_name === 'success_rate')
          ? (100 - (dbMetrics.find((m: any) => m.metric_name === 'success_rate').metric_value || 0)).toFixed(2) + '%'
          : 'N/A'
      },
      syncFrequency: {
        avgTimeBetweenSyncs: avgTimeBetweenSyncs ? `${avgTimeBetweenSyncs} minutes` : 'N/A',
        syncsPerDay: days > 0 && dbMetrics?.find((m: any) => m.metric_name === 'success_rate')
          ? Math.round((dbMetrics.find((m: any) => m.metric_name === 'success_rate').metric_detail?.total_syncs || 0) / days * 10) / 10
          : 0
      },
      performance: {
        avgItemsPerSecond: itemsPerSecondTrend && itemsPerSecondTrend.length > 0
          ? Math.round(itemsPerSecondTrend.reduce((sum, t) => sum + t.itemsPerSecond, 0) / itemsPerSecondTrend.length * 10) / 10
          : 'N/A',
        trend: itemsPerSecondTrend?.slice(-5) // Last 5 data points
      },
      hourlyBreakdown
    }
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error generating metrics:', error)
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    )
  }
}