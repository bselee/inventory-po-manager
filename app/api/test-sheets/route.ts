import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = createApiHandler(async ({ body }) => {
  try {
    const settings = body
    
    if (!settings.google_sheet_id || !settings.google_sheets_api_key) {
      return apiResponse({ 
        success: false, 
        error: 'Missing Google Sheets credentials' 
      }, { status: 400 })
    }

    // Test Google Sheets API connection
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${settings.google_sheet_id}?key=${settings.google_sheets_api_key}`
    
    const response = await fetch(sheetsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return apiResponse({ 
        success: true, 
        message: `Connected to sheet: ${data.properties?.title || 'Unknown'}` 
      })
    } else {
      const error = await response.json()
      return apiResponse({ 
        success: false, 
        error: `Google Sheets API error: ${error.error?.message || 'Invalid credentials'}` 
      }, { status: 400 })
    }
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})