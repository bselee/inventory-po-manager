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
    
    // Insert a single record - let the database generate the UUID
    // Only include columns that exist in the database
    const settingsData: any = {
      finale_api_key: latestSettings.finale_api_key,
      finale_api_secret: latestSettings.finale_api_secret,
      finale_account_path: latestSettings.finale_account_path,
      updated_at: new Date().toISOString()
    }
    
    // Add optional fields only if they exist in the original record
    if ('finale_username' in latestSettings) {
      settingsData.finale_username = latestSettings.finale_username || ''
    }
    if ('finale_password' in latestSettings) {
      settingsData.finale_password = latestSettings.finale_password || ''
    }
    if ('sync_frequency' in latestSettings) {
      settingsData.sync_frequency = latestSettings.sync_frequency || 'daily'
    }
    
    const { data, error } = await supabase
      .from('settings')
      .insert(settingsData)
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
      message: 'Settings consolidated to single record',
      settings: data
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fix settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}