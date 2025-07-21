import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET() {
  try {
    // Get all settings records
    const { data: allSettings, error: allError } = await supabase
      .from('settings')
      .select('*')
    
    // Try the getFinaleConfig function
    const { getFinaleConfig } = await import('@/lib/finale-api')
    const config = await getFinaleConfig()
    
    // Get environment variables (masked)
    const envVars = {
      FINALE_API_KEY: process.env.FINALE_API_KEY ? '***' + process.env.FINALE_API_KEY.slice(-4) : 'not set',
      FINALE_API_SECRET: process.env.FINALE_API_SECRET ? '***set' : 'not set',
      FINALE_ACCOUNT_PATH: process.env.FINALE_ACCOUNT_PATH || 'not set'
    }
    
    return NextResponse.json({
      settings: {
        count: allSettings?.length || 0,
        records: allSettings?.map(s => ({
          id: s.id,
          hasApiKey: !!s.finale_api_key,
          apiKeyPreview: s.finale_api_key ? '***' + s.finale_api_key.slice(-4) : null,
          hasApiSecret: !!s.finale_api_secret,
          hasAccountPath: !!s.finale_account_path,
          accountPath: s.finale_account_path,
          created_at: s.created_at,
          updated_at: s.updated_at
        }))
      },
      configResult: {
        found: !!config,
        hasAllFields: config ? !!(config.apiKey && config.apiSecret && config.accountPath) : false
      },
      environmentVariables: envVars,
      error: allError?.message
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}