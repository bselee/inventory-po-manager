import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    // First, delete any existing settings
    await supabase.from('settings').delete().neq('id', 'impossible-id')
    
    // Insert the credentials directly
    const { data, error } = await supabase
      .from('settings')
      .insert({
        finale_api_key: 'I9TVdRvblFod',
        finale_api_secret: '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
        finale_account_path: 'buildasoilorganics',
        finale_username: null,
        finale_password: null,
        google_sheet_id: null,
        google_sheets_api_key: null,
        sendgrid_api_key: null,
        from_email: null,
        low_stock_threshold: 10,
        sync_frequency_minutes: 60,
        sync_enabled: true
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Credentials inserted successfully',
      data: {
        id: data.id,
        finale_configured: true,
        account_path: data.finale_account_path
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}