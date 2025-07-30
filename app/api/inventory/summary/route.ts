import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { getInventorySummary } from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/inventory/summary - Get inventory summary statistics
export const GET = createApiHandler(async () => {
  const summary = await getInventorySummary()
  
  return apiResponse({ 
    total_items: summary.total_items,
    total_inventory_value: summary.total_inventory_value,
    out_of_stock_count: summary.out_of_stock_count,
    low_stock_count: summary.low_stock_count,
    critical_reorder_count: summary.low_stock_count, // Same as low stock
    overstocked_count: 0 // Not calculated in summary
  })
})