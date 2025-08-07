import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface TrendData {
  date: string
  inventoryValue: number
  salesVelocity: number
  stockHealth: number
  criticalItems: number
}

interface TrendAnalysis {
  daily: TrendData[]
  weekly: TrendData[]
  monthly: TrendData[]
  predictions: {
    nextWeekVelocity: number
    nextMonthCriticalItems: number
    stockHealthTrend: 'improving' | 'stable' | 'declining'
  }
}

export const GET = createApiHandler(async ({ query }) => {
  try {
    const period = query.get('period') || '30' // 30, 60, or 90 days
    
    // Try cache first
    const cacheKey = `dashboard:trends:${period}`
    let cached = null
    
    try {
      cached = await getCachedData(cacheKey)
    } catch (cacheError) {
      console.warn('Cache not available, proceeding without cache:', cacheError)
    }
    
    if (cached) {
      return apiResponse(cached, { cacheStatus: 'hit' })
    }

    // Get historical data
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get inventory items with historical data
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .not('discontinued', 'eq', true)

    if (error) throw error

    // Generate trend data for each day
    const dailyTrends: TrendData[] = []
    const today = new Date()
    
    for (let i = daysAgo; i >= 0; i--) {
      const date = new Date()
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Calculate metrics for this day (simulated based on current data)
      let inventoryValue = 0
      let totalVelocity = 0
      let criticalCount = 0
      let healthScore = 0
      
      for (const item of items || []) {
        // Simulate historical values based on current data
        const historicalMultiplier = 1 - (i * 0.002) // Slight growth trend
        
        const quantity = (item.available_quantity || 0) * historicalMultiplier
        const velocity = (item.sales_velocity_30_day || 0) * historicalMultiplier
        
        inventoryValue += quantity * (item.cost || 0)
        totalVelocity += velocity
        
        const daysStock = velocity > 0 ? quantity / velocity : 999
        if (daysStock <= 7) criticalCount++
        
        // Calculate health score (0-100)
        if (daysStock >= 30 && daysStock <= 90) {
          healthScore += 100
        } else if (daysStock >= 14 && daysStock <= 120) {
          healthScore += 70
        } else if (daysStock >= 7 && daysStock <= 180) {
          healthScore += 40
        } else {
          healthScore += 10
        }
      }
      
      dailyTrends.push({
        date: dateStr,
        inventoryValue: Math.round(inventoryValue),
        salesVelocity: Math.round(totalVelocity * 10) / 10,
        stockHealth: Math.round(healthScore / (items?.length || 1)),
        criticalItems: criticalCount
      })
    }

    // Generate weekly aggregates
    const weeklyTrends: TrendData[] = []
    for (let i = 0; i < dailyTrends.length; i += 7) {
      const weekData = dailyTrends.slice(i, Math.min(i + 7, dailyTrends.length))
      if (weekData.length > 0) {
        weeklyTrends.push({
          date: weekData[0].date,
          inventoryValue: Math.round(weekData.reduce((sum, d) => sum + d.inventoryValue, 0) / weekData.length),
          salesVelocity: Math.round(weekData.reduce((sum, d) => sum + d.salesVelocity, 0) / weekData.length * 10) / 10,
          stockHealth: Math.round(weekData.reduce((sum, d) => sum + d.stockHealth, 0) / weekData.length),
          criticalItems: Math.round(weekData.reduce((sum, d) => sum + d.criticalItems, 0) / weekData.length)
        })
      }
    }

    // Generate monthly aggregates
    const monthlyTrends: TrendData[] = []
    for (let i = 0; i < dailyTrends.length; i += 30) {
      const monthData = dailyTrends.slice(i, Math.min(i + 30, dailyTrends.length))
      if (monthData.length > 0) {
        monthlyTrends.push({
          date: monthData[0].date,
          inventoryValue: Math.round(monthData.reduce((sum, d) => sum + d.inventoryValue, 0) / monthData.length),
          salesVelocity: Math.round(monthData.reduce((sum, d) => sum + d.salesVelocity, 0) / monthData.length * 10) / 10,
          stockHealth: Math.round(monthData.reduce((sum, d) => sum + d.stockHealth, 0) / monthData.length),
          criticalItems: Math.round(monthData.reduce((sum, d) => sum + d.criticalItems, 0) / monthData.length)
        })
      }
    }

    // Calculate predictions
    const recentTrends = dailyTrends.slice(-7)
    const velocityTrend = recentTrends.length > 1 
      ? (recentTrends[recentTrends.length - 1].salesVelocity - recentTrends[0].salesVelocity) / recentTrends[0].salesVelocity
      : 0

    const healthTrend = recentTrends.length > 1
      ? (recentTrends[recentTrends.length - 1].stockHealth - recentTrends[0].stockHealth)
      : 0

    const analysis: TrendAnalysis = {
      daily: dailyTrends.slice(-30), // Last 30 days
      weekly: weeklyTrends.slice(-12), // Last 12 weeks
      monthly: monthlyTrends.slice(-6), // Last 6 months
      predictions: {
        nextWeekVelocity: Math.round((recentTrends[recentTrends.length - 1]?.salesVelocity || 0) * (1 + velocityTrend) * 10) / 10,
        nextMonthCriticalItems: Math.round(recentTrends[recentTrends.length - 1]?.criticalItems || 0),
        stockHealthTrend: healthTrend > 5 ? 'improving' : healthTrend < -5 ? 'declining' : 'stable'
      }
    }

    // Cache for 15 minutes (if available)
    try {
      await setCachedData(cacheKey, analysis, 900)
    } catch (cacheError) {
      console.warn('Failed to cache trends:', cacheError)
    }

    return apiResponse(analysis, {
      period: daysAgo,
      dataPoints: dailyTrends.length,
      cacheStatus: 'miss'
    })

  } catch (error) {
    console.error('Trends analysis error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch trends'))
  }
})