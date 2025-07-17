import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Received settings:', body)
    
    // Delete all existing settings first
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .neq('id', 'impossible-id') // Delete all rows
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
    }
    
    // Insert fresh settings
    const { data, error } = await supabase
      .from('settings')
      .insert({
        finale_api_key: body.finale_api_key || '',
        finale_api_secret: body.finale_api_secret || '',
        finale_account_path: body.finale_account_path || '',
        finale_username: body.finale_username || '',
        finale_password: body.finale_password || '',
        google_sheet_id: body.google_sheet_id || '',
        google_sheets_api_key: body.google_sheets_api_key || '',
        sendgrid_api_key: body.sendgrid_api_key || '',
        from_email: body.from_email || '',
        low_stock_threshold: body.low_stock_threshold || 10,
        sync_frequency_minutes: body.sync_frequency_minutes || 60,
        sync_enabled: body.sync_enabled !== false
      })
      .select()
      .single()
    
    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }
    
    console.log('Settings saved successfully:', data)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      data
    })
  } catch (error) {
    console.error('Catch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}