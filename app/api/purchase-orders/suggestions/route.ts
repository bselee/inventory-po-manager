/**
 * API endpoint for getting detailed PO suggestions with reorder analysis
 * GET /api/purchase-orders/suggestions - Get items needing reorder with analysis
 */

import { NextResponse } from 'next/server'
import POGenerationService from '@/app/lib/po-generation-service'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ReorderAnalysis {
  total_items_needing_reorder: number
  critical_items: number
  high_priority_items: number
  medium_priority_items: number
  low_priority_items: number
  vendors_affected: number
  estimated_total_cost: number
  items_by_vendor: Record<string, any[]>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendor_id')
    const urgency = searchParams.get('urgency')
    const includeAnalysis = searchParams.get('include_analysis') !== 'false'
    
    const poService = new POGenerationService()
    
    // Get items needing reorder
    const itemsNeedingReorder = await poService.getItemsNeedingReorder()
    
    // Filter by vendor if specified
    let filteredItems = itemsNeedingReorder
    if (vendorId) {
      filteredItems = itemsNeedingReorder.filter(item => 
        item.vendor_id === vendorId || item.vendor_name === vendorId
      )
    }
    
    // Filter by urgency if specified
    if (urgency) {
      filteredItems = filteredItems.filter(item => {
        const days = item.days_until_stockout || 999
        switch (urgency) {
          case 'critical': return days <= 7
          case 'high': return days > 7 && days <= 14
          case 'medium': return days > 14 && days <= 30
          case 'low': return days > 30
          default: return true
        }
      })
    }
    
    // Prepare analysis if requested
    let analysis: ReorderAnalysis | null = null
    if (includeAnalysis) {
      const itemsByVendor: Record<string, any[]> = {}
      let totalCost = 0
      
      for (const item of filteredItems) {
        const vendor = item.vendor_name || item.vendor_id || 'Unknown'
        if (!itemsByVendor[vendor]) {
          itemsByVendor[vendor] = []
        }
        
        // Calculate suggested order cost
        const suggestedQty = item.reorder_quantity || 
          Math.max(item.reorder_point - item.current_stock, 0) || 
          10 // Default minimum
        const itemCost = suggestedQty * (item.unit_cost || 0)
        totalCost += itemCost
        
        itemsByVendor[vendor].push({
          ...item,
          suggested_quantity: suggestedQty,
          estimated_cost: itemCost
        })
      }
      
      analysis = {
        total_items_needing_reorder: filteredItems.length,
        critical_items: filteredItems.filter(i => (i.days_until_stockout || 999) <= 7).length,
        high_priority_items: filteredItems.filter(i => {
          const days = i.days_until_stockout || 999
          return days > 7 && days <= 14
        }).length,
        medium_priority_items: filteredItems.filter(i => {
          const days = i.days_until_stockout || 999
          return days > 14 && days <= 30
        }).length,
        low_priority_items: filteredItems.filter(i => (i.days_until_stockout || 999) > 30).length,
        vendors_affected: Object.keys(itemsByVendor).length,
        estimated_total_cost: totalCost,
        items_by_vendor: itemsByVendor
      }
    }
    
    return NextResponse.json({
      items: filteredItems,
      total_count: filteredItems.length,
      analysis,
      filters_applied: {
        vendor_id: vendorId,
        urgency
      }
    })
  } catch (error) {
    console.error('Error fetching reorder suggestions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reorder suggestions' },
      { status: 500 }
    )
  }
}