import { NextResponse } from 'next/server'
import { FinaleSessionApiService } from '@/app/lib/finale-session-api'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = createApiHandler(async ({ body }) => {
  try {
    const settings = body
    
    // Check which credentials are provided
    const hasApiKey = !!(settings.finale_api_key && settings.finale_api_secret)
    const hasUserPass = !!(settings.finale_username && settings.finale_password)
    
    if (!settings.finale_account_path) {
      return apiResponse({ 
        success: false, 
        error: 'Missing Finale account path',
        debug: { hasApiKey, hasUserPass }
      }, { status: 400 })
    }

    // Clean account path
    const cleanAccountPath = settings.finale_account_path
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()

    const results = {
      apiKeyAuth: null as any,
      sessionAuth: null as any,
      recommendations: [] as string[]
    }

    // Test API Key authentication
    if (hasApiKey) {
      console.log('Testing API Key authentication...')
      try {
        const authString = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
        const testUrl = `https://app.finaleinventory.com/api/${cleanAccountPath}/product?limit=1`
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          results.apiKeyAuth = {
            success: true,
            message: 'API Key authentication successful',
            productCount: Array.isArray(data) ? data.length : 0
          }
        } else {
          const errorText = await response.text()
          results.apiKeyAuth = {
            success: false,
            error: `API Key auth failed: ${response.status} ${response.statusText}`,
            details: errorText
          }
        }
      } catch (error: any) {
        results.apiKeyAuth = {
          success: false,
          error: `API Key auth error: ${error.message}`
        }
      }
    }

    // Test Session (username/password) authentication
    if (hasUserPass) {
      console.log('Testing Session authentication...')
      try {
        const sessionApi = new FinaleSessionApiService({
          username: settings.finale_username,
          password: settings.finale_password,
          accountPath: cleanAccountPath
        })

        const authenticated = await sessionApi.authenticate()
        
        if (authenticated) {
          // Try to fetch some data to verify session works
          try {
            const inventory = await sessionApi.getInventory('Shipping', 1, 1)
            results.sessionAuth = {
              success: true,
              message: 'Session authentication successful',
              canAccessData: true,
              sampleData: inventory
            }
          } catch (dataError: any) {
            results.sessionAuth = {
              success: true,
              message: 'Session authentication successful',
              canAccessData: false,
              dataError: dataError.message
            }
          }
          
          // Clean up session
          await sessionApi.logout()
        } else {
          results.sessionAuth = {
            success: false,
            error: 'Session authentication failed - check username/password'
          }
        }
      } catch (error: any) {
        results.sessionAuth = {
          success: false,
          error: `Session auth error: ${error.message}`
        }
      }
    }

    // Provide recommendations
    if (results.apiKeyAuth?.success && !results.sessionAuth?.success) {
      results.recommendations.push('API Key authentication is working. This is the recommended method for API access.')
    } else if (!results.apiKeyAuth?.success && results.sessionAuth?.success) {
      results.recommendations.push('Session authentication is working. Consider generating API keys for better security.')
      results.recommendations.push('To generate API keys: Settings > Users > API Keys in Finale')
    } else if (results.apiKeyAuth?.success && results.sessionAuth?.success) {
      results.recommendations.push('Both authentication methods work. API Key auth is recommended for this application.')
    } else {
      results.recommendations.push('No authentication method succeeded. Please check your credentials.')
      results.recommendations.push('Account path should be just your company identifier (e.g., "yourcompany")')
    }

    // Determine overall success
    const overallSuccess = results.apiKeyAuth?.success || results.sessionAuth?.success

    return apiResponse({ 
      success: overallSuccess,
      message: overallSuccess ? 'Finale connection successful' : 'All authentication methods failed',
      results,
      debug: {
        accountPath: cleanAccountPath,
        hasApiKey,
        hasUserPass,
        testedMethods: {
          apiKey: hasApiKey,
          session: hasUserPass
        }
      }
    })
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})