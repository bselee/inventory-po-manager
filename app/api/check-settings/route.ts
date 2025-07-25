import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    // Get all settings records
    const { data: allSettings, error: allError } = await supabase
      .from('settings')
      .select('*')
      .order('created_at', { ascending: false })

    // Get the config using the helper function
    const config = await getFinaleConfig()

    // Get single settings record
    const { data: singleSettings, error: singleError } = await supabase
      .from('settings')
      .select('*')
      .single()

    return apiResponse({
      allSettings: {
        count: allSettings?.length || 0,
        records: allSettings?.map(s => ({
          id: s.id,
          hasApiKey: !!s.finale_api_key,
          hasApiSecret: !!s.finale_api_secret,
          hasAccountPath: !!s.finale_account_path,
          accountPath: s.finale_account_path,
          created_at: s.created_at
        })),
        error: allError?.message
      },
      singleSettings: {
        found: !!singleSettings,
        hasApiKey: !!singleSettings?.finale_api_key,
        hasApiSecret: !!singleSettings?.finale_api_secret,
        hasAccountPath: !!singleSettings?.finale_account_path,
        accountPath: singleSettings?.finale_account_path,
        error: singleError?.message
      },
      finaleConfig: {
        found: !!config,
        config: config ? {
          hasApiKey: !!config.apiKey,
          hasApiSecret: !!config.apiSecret,
          accountPath: config.accountPath,
          // Mask sensitive data
          apiKey: config.apiKey ? `${config.apiKey.slice(0, 4)}...` : null,
          apiSecret: config.apiSecret ? '***' : null
        } : null
      }
    })
  } catch (error) {
    throw error
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_READ]
})