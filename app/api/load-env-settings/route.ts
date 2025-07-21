import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET() {
  try {
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single()

    if (existingSettings) {
      return NextResponse.json({ 
        message: 'Settings already exist',
        hasSettings: true 
      })
    }

    // Load from environment variables
    const envSettings = {
      finale_api_key: process.env.FINALE_API_KEY || '',
      finale_api_secret: process.env.FINALE_API_SECRET || '',
      finale_account_path: process.env.FINALE_ACCOUNT_PATH || '',
      low_stock_threshold: 10,
      sync_frequency_minutes: 60,
      sync_enabled: true
    }

    // Clean up the account path - extract just the account name
    if (envSettings.finale_account_path) {
      // Handle various formats:
      // https://app.finaleinventory.com/buildasoilorganics/
      // https://app.finaleinventory.com/buildasoilorganics/sc2/
      // buildasoilorganics
      const match = envSettings.finale_account_path.match(/finaleinventory\.com\/([^\/]+)/)
      if (match) {
        envSettings.finale_account_path = match[1]
      } else {
        // If no URL, assume it's already just the account name
        envSettings.finale_account_path = envSettings.finale_account_path
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .split('/')[0]
      }
    }

    return NextResponse.json({
      hasSettings: false,
      envSettings,
      message: 'Environment settings loaded'
    })
  } catch (error) {
    console.error('Error loading env settings:', error)
    return NextResponse.json({ 
      error: 'Failed to load settings',
      hasSettings: false 
    }, { status: 500 })
  }
}