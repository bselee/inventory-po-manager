import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        hasSettings: false
      }, { status: 500 })
    }
    
    // Don't return sensitive data in full, just show what's configured
    return NextResponse.json({
      success: true,
      hasSettings: true,
      configured: {
        finale_api_key: data.finale_api_key ? '✓ Set' : '✗ Not set',
        finale_api_secret: data.finale_api_secret ? '✓ Set' : '✗ Not set',
        finale_account_path: data.finale_account_path || '✗ Not set',
        finale_username: data.finale_username ? '✓ Set' : '✗ Not set',
        finale_password: data.finale_password ? '✓ Set' : '✗ Not set',
        low_stock_threshold: data.low_stock_threshold || 10,
        sync_frequency_minutes: data.sync_frequency_minutes || 60,
        sync_enabled: data.sync_enabled !== false
      },
      last_updated: data.last_updated
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}