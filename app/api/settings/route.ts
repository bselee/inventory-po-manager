import { z } from 'zod'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import {
  getSettings,
  upsertSettings,
  getFinaleConfig,
  getEmailConfig
} from '@/app/lib/data-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Validation schema for settings update
const updateSettingsSchema = z.object({
  finale_api_key: z.string().optional().nullable(),
  finale_api_secret: z.string().optional().nullable(),
  finale_account_path: z.string().optional().nullable(),
  sync_enabled: z.boolean().optional(),
  alert_email: z.string().email().optional().nullable(),
  sendgrid_api_key: z.string().optional().nullable(),
  email_alerts_enabled: z.boolean().optional(),
  low_stock_threshold: z.number().min(0).optional(),
  auto_generate_po: z.boolean().optional()
})

// GET /api/settings - Fetch application settings
export const GET = createApiHandler(async () => {
  const settings = await getSettings()
  const finaleConfig = await getFinaleConfig()
  const emailConfig = await getEmailConfig()
  
  // Transform settings for frontend
  const transformedSettings = {
    finaleApi: {
      enabled: !!finaleConfig,
      apiKey: settings?.finale_api_key ? '***' : '',
      apiSecret: settings?.finale_api_secret ? '***' : '',
      accountPath: settings?.finale_account_path || '',
      lastSync: settings?.last_sync_date || null
    },
    email: {
      enabled: settings?.email_alerts_enabled || false,
      alertEmail: settings?.alert_email || '',
      sendgridApiKey: settings?.sendgrid_api_key ? '***' : ''
    },
    sync: {
      enabled: settings?.sync_enabled || false,
      lowStockThreshold: settings?.low_stock_threshold || 10,
      autoGeneratePO: settings?.auto_generate_po || false
    },
    general: {
      companyName: 'BuildASoil',
      timezone: 'America/Denver',
      currency: 'USD'
    }
  }

  return apiResponse({ settings: transformedSettings })
})

// PUT /api/settings - Update application settings
export const PUT = createApiHandler(async ({ body }) => {
  // Upsert settings (will create if doesn't exist)
  const updatedSettings = await upsertSettings(body)
  
  return apiResponse(
    { settings: updatedSettings },
    { message: 'Settings updated successfully' }
  )
}, {
  validateBody: updateSettingsSchema
})

// POST /api/settings/test-finale - Test Finale API connection
export const POST = createApiHandler(async () => {
  const config = await getFinaleConfig()
  
  if (!config) {
    throw new Error('Finale API not configured')
  }

  // Test the connection by making a simple API call
  try {
    const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/products?limit=1`
    const authHeader = 'Basic ' + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API test failed: ${response.status} ${response.statusText}`)
    }

    return apiResponse(
      { success: true },
      { message: 'Finale API connection successful' }
    )
  } catch (error) {
    throw new Error(`Failed to connect to Finale API: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})