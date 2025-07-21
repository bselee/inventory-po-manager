import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // First check if settings exist
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single()
    
    if (existing) {
      // Update existing settings
      const { error } = await supabase
        .from('settings')
        .update({
          finale_api_key: body.finale_api_key,
          finale_api_secret: body.finale_api_secret,
          finale_account_path: body.finale_account_path,
          finale_username: body.finale_username,
          finale_password: body.finale_password,
          low_stock_threshold: body.low_stock_threshold || 10,
          sync_frequency_minutes: body.sync_frequency_minutes || 60,
          sync_enabled: body.sync_enabled !== false,
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: 'Settings updated successfully',
        action: 'update'
      })
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('settings')
        .insert({
          finale_api_key: body.finale_api_key,
          finale_api_secret: body.finale_api_secret,
          finale_account_path: body.finale_account_path,
          finale_username: body.finale_username,
          finale_password: body.finale_password,
          low_stock_threshold: body.low_stock_threshold || 10,
          sync_frequency_minutes: body.sync_frequency_minutes || 60,
          sync_enabled: body.sync_enabled !== false,
          last_updated: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: 'Settings created successfully',
        action: 'insert',
        data
      })
    }
  } catch (error) {
    console.error('Force save error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}