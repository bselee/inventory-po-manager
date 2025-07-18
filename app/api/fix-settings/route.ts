import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // First, get the most recent settings record
    const { data: latestSettings } = await supabase
      .from('settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!latestSettings) {
      return NextResponse.json({
        error: 'No settings found to fix'
      }, { status: 404 })
    }
    
    // Delete all settings records
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .neq('id', 'dummy') // Delete all records
    
    if (deleteError) {
      console.error('Error deleting settings:', deleteError)
    }
    
    // Insert a single record with id=1
    const { data, error } = await supabase
      .from('settings')
      .insert({
        id: 1,
        finale_api_key: latestSettings.finale_api_key,
        finale_api_secret: latestSettings.finale_api_secret,
        finale_account_path: latestSettings.finale_account_path,
        finale_username: latestSettings.finale_username || '',
        finale_password: latestSettings.finale_password || '',
        sync_frequency: latestSettings.sync_frequency || 'daily',
        notification_email: latestSettings.notification_email || '',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to fix settings',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Settings consolidated to single record with id=1',
      settings: data
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fix settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}