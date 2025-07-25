import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = createApiHandler(async ({ body }) => {
  try {
    const settings = body
    
    if (!settings.sendgrid_api_key || !settings.from_email) {
      return apiResponse({ 
        success: false, 
        error: 'Missing SendGrid credentials' 
      }, { status: 400 })
    }

    // Test SendGrid API connection by verifying the API key
    const response = await fetch(
      'https://api.sendgrid.com/v3/scopes',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.sendgrid_api_key}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      return apiResponse({ 
        success: true, 
        message: `SendGrid connected with ${data.scopes?.length || 0} permission scopes` 
      })
    } else {
      const error = await response.json()
      return apiResponse({ 
        success: false, 
        error: `SendGrid API error: ${error.errors?.[0]?.message || 'Invalid API key'}` 
      }, { status: 400 })
    }
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})