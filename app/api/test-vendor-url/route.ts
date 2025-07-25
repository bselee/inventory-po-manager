import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return apiResponse({ error: 'No config found' }, { status: 404 })
    }
    
    const finaleApi = new FinaleApiService(config)
    
    // Get the base URL from the service
    const baseUrl = finaleApi['baseUrl']
    const vendorUrl = `${baseUrl}/vendors?limit=1`
    
    // Try to fetch with the URL
    const response = await fetch(vendorUrl, {
      headers: {
        'Authorization': finaleApi['authHeader'],
        'Accept': 'application/json'
      }
    })
    
    const responseText = await response.text()
    
    return apiResponse({
      config: {
        accountPath: config.accountPath,
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret
      },
      urls: {
        baseUrl,
        vendorUrl,
        decodedUrl: decodeURIComponent(vendorUrl)
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        preview: responseText.substring(0, 500)
      }
    })
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})