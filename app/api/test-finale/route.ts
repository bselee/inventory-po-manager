import { NextResponse } from 'next/server'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = createApiHandler(async ({ body }) => {
  try {
    const settings = body
    
    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Finale credentials' 
      }, { status: 400 })
    }

    // Test Finale API connection - correct pattern is /{account}/api/
    const cleanPath = settings.finale_account_path
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()
    const finaleUrl = `https://app.finaleinventory.com/${cleanPath}/api/product?limit=1`
    const finaleAuth = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
    
    const response = await fetch(finaleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${finaleAuth}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return apiResponse({ 
        success: true, 
        message: 'Finale connection successful' 
      })
    } else {
      return apiResponse({ 
        success: false, 
        error: `Finale API error: ${response.status} ${response.statusText}` 
      }, { status: 400 })
    }
  } catch (error) {
    return apiError(error)
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})