import { NextResponse } from 'next/server'
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
      return apiResponse({
        error: 'No config found',
        configured: false
      }, { status: 404 })
    }
    
    const finaleApi = new FinaleApiService(config)
    
    // Get the URL and auth header being used
    const baseUrl = finaleApi['baseUrl']
    const authHeader = finaleApi['authHeader']
    
    // Test the exact URL
    const testUrl = `${baseUrl}/product?limit=1`
    
    console.log('[Test Connection] Testing URL:', testUrl)
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    const responseText = await response.text()
    
    return apiResponse({
      configured: true,
      config: {
        accountPath: config.accountPath,
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret
      },
      test: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responsePreview: responseText.substring(0, 500)
      },
      expectedUrl: `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    })
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})