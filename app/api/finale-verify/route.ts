import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Get settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({
        success: false,
        error: 'No settings found',
        setupRequired: true
      })
    }

    // Check what credentials we have
    const hasApiCredentials = !!(settings.finale_api_key && settings.finale_api_secret && settings.finale_account_path)
    const hasSessionCredentials = !!(settings.finale_username && settings.finale_password && settings.finale_account_path)

    // If we have API credentials, test them
    if (hasApiCredentials) {
      try {
        const finaleApi = new FinaleApiService({
          apiKey: settings.finale_api_key,
          apiSecret: settings.finale_api_secret,
          accountPath: settings.finale_account_path
        })

        // Try to fetch products from current year
        const testResult = await finaleApi.getAllProducts({ filterYear: new Date().getFullYear() })
        
        return NextResponse.json({
          success: true,
          message: 'Finale API is working!',
          credentials: {
            type: 'API Key',
            accountPath: settings.finale_account_path,
            testResult: {
              hasData: testResult.length > 0,
              sampleProduct: testResult[0] || null
            }
          }
        })
      } catch (apiError: any) {
        return NextResponse.json({
          success: false,
          error: 'API test failed',
          details: apiError.message,
          credentials: {
            type: 'API Key',
            accountPath: settings.finale_account_path,
            hasKey: !!settings.finale_api_key,
            hasSecret: !!settings.finale_api_secret
          }
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No Finale credentials configured',
      credentials: {
        hasApiKey: !!settings.finale_api_key,
        hasApiSecret: !!settings.finale_api_secret,
        hasUsername: !!settings.finale_username,
        hasPassword: !!settings.finale_password,
        accountPath: settings.finale_account_path
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    }, { status: 500 })
  }
}