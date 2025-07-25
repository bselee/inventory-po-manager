import { supabase } from '@/app/lib/supabase'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    // Get inventory items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(10)
    
    // Get inventory summary
    const { data: summary, error: summaryError } = await supabase
      .from('inventory_summary')
      .select('*')
      .single()
    
    return apiResponse({
      inventory: {
        count: items?.length || 0,
        items: items?.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.product_name,
          stock: item.stock,
          location: item.location,
          vendor: item.vendor,
          cost: item.cost
        })),
        error: itemsError?.message
      },
      summary: {
        data: summary,
        error: summaryError?.message
      }
    })
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})