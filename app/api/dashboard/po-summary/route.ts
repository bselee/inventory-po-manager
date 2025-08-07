import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface POSummary {
  recentActivity: {
    id: string
    po_number: string
    vendor_name: string
    total_amount: number
    status: string
    created_at: string
    item_count: number
    expected_delivery: string | null
  }[]
  pipeline: {
    pending: number
    submitted: number
    approved: number
    received: number
    total: number
  }
  upcomingDeliveries: {
    vendor_name: string
    po_number: string
    expected_date: string
    total_amount: number
    status: string
  }[]
  metrics: {
    averageProcessingTime: number // days
    totalPendingValue: number
    poCreatedThisWeek: number
    poCreatedThisMonth: number
  }
}

export const GET = createApiHandler(async ({ query }) => {
  try {
    const limit = parseInt(query.get('limit') || '10')
    
    // Try cache first
    const cacheKey = `dashboard:po-summary:${limit}`
    let cached = null
    
    try {
      cached = await getCachedData(cacheKey)
    } catch (cacheError) {
      console.warn('Cache not available, proceeding without cache:', cacheError)
    }
    
    if (cached) {
      return apiResponse(cached, { cacheStatus: 'hit' })
    }

    // Get recent POs with vendor info
    const { data: recentPOs, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (poError) throw poError

    // Get pipeline counts
    const { data: pipeline, error: pipelineError } = await supabase
      .from('purchase_orders')
      .select('status')
      .in('status', ['pending', 'submitted', 'approved', 'received'])

    if (pipelineError) throw pipelineError

    // Count by status
    const pipelineCounts = {
      pending: 0,
      submitted: 0,
      approved: 0,
      received: 0,
      total: 0
    }

    for (const po of pipeline || []) {
      pipelineCounts[po.status as keyof typeof pipelineCounts]++
      pipelineCounts.total++
    }

    // Get upcoming deliveries (POs with expected dates)
    const { data: upcomingPOs, error: upcomingError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors (
          name
        )
      `)
      .not('expected_delivery', 'is', null)
      .gte('expected_delivery', new Date().toISOString())
      .order('expected_delivery', { ascending: true })
      .limit(5)

    if (upcomingError) throw upcomingError

    // Calculate metrics
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const { data: weekPOs } = await supabase
      .from('purchase_orders')
      .select('id')
      .gte('created_at', weekAgo.toISOString())

    const { data: monthPOs } = await supabase
      .from('purchase_orders')
      .select('id')
      .gte('created_at', monthAgo.toISOString())

    // Calculate average processing time
    const { data: completedPOs } = await supabase
      .from('purchase_orders')
      .select('created_at, updated_at')
      .eq('status', 'received')
      .not('updated_at', 'is', null)
      .limit(20)

    let totalProcessingTime = 0
    let processedCount = 0

    for (const po of completedPOs || []) {
      if (po.created_at && po.updated_at) {
        const created = new Date(po.created_at)
        const updated = new Date(po.updated_at)
        const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        totalProcessingTime += days
        processedCount++
      }
    }

    // Calculate total pending value
    let totalPendingValue = 0
    for (const po of recentPOs || []) {
      if (po.status !== 'received' && po.status !== 'cancelled') {
        totalPendingValue += po.total_amount || 0
      }
    }

    const summary: POSummary = {
      recentActivity: (recentPOs || []).map(po => ({
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendors?.name || 'Unknown',
        total_amount: po.total_amount || 0,
        status: po.status,
        created_at: po.created_at,
        item_count: po.items?.length || 0,
        expected_delivery: po.expected_delivery
      })),
      pipeline: pipelineCounts,
      upcomingDeliveries: (upcomingPOs || []).map(po => ({
        vendor_name: po.vendors?.name || 'Unknown',
        po_number: po.po_number,
        expected_date: po.expected_delivery,
        total_amount: po.total_amount || 0,
        status: po.status
      })),
      metrics: {
        averageProcessingTime: processedCount > 0 
          ? Math.round(totalProcessingTime / processedCount * 10) / 10 
          : 0,
        totalPendingValue: Math.round(totalPendingValue * 100) / 100,
        poCreatedThisWeek: weekPOs?.length || 0,
        poCreatedThisMonth: monthPOs?.length || 0
      }
    }

    // Cache for 5 minutes (if available)
    try {
      await setCachedData(cacheKey, summary, 300)
    } catch (cacheError) {
      console.warn('Failed to cache PO summary:', cacheError)
    }

    return apiResponse(summary, {
      cacheStatus: 'miss'
    })

  } catch (error) {
    console.error('PO summary error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch PO summary'))
  }
})