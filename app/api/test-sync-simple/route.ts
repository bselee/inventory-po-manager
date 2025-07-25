import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    // Step 1: Get config
    const config = await getFinaleConfig()
    if (!config) {
      return apiResponse({ error: 'No config', step: 1 }, { status: 400 })
    }
    
    // Step 2: Create service
    const finaleApi = new FinaleApiService(config)
    
    // Step 3: Test connection
    const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      return apiResponse({ 
        error: 'Connection failed', 
        step: 3,
        status: response.status 
      }, { status: 400 })
    }
    
    // Step 4: Try to get products without year filter
    try {
      // First try without filter to see all products
      const allProducts = await finaleApi.getInventoryData(null)
      
      // Then try with current year
      const currentYearProducts = await finaleApi.getInventoryData(new Date().getFullYear())
      
      return apiResponse({
        success: true,
        allProductsCount: allProducts.length,
        currentYearCount: currentYearProducts.length,
        sampleProduct: allProducts[0] || null,
        message: allProducts.length > 0 ? 'Products found!' : 'No products found',
        oldestYear: allProducts.length > 0 ? new Date(allProducts[0].lastModifiedDate || '').getFullYear() : null
      })
    } catch (err) {
      return apiResponse({
        error: 'Failed to get products',
        step: 4,
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 400 })
    }
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})