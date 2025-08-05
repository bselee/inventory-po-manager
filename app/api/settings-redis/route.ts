import { NextResponse } from 'next/server'
import { redisSettingsService } from '@/app/lib/redis-settings-service'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings-redis - Get settings from Redis
export async function GET() {
  try {
    const settings = await redisSettingsService.getSettings()
    
    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('[Settings Redis API] Error getting settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings-redis - Update settings in Redis
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    // Validate settings
    const validation = redisSettingsService.validateSettings(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validation.errors 
        },
        { status: 400 }
      )
    }
    
    // Update settings
    const updated = await redisSettingsService.updateSettings(body)
    
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('[Settings Redis API] Error updating settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings-redis/migrate - Migrate from Supabase
export async function POST(request: Request) {
  try {
    const { pathname } = new URL(request.url)
    
    if (pathname.endsWith('/migrate')) {
      // Get settings from Supabase
      const { data: supabaseSettings, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (error) {
        throw new Error(`Failed to get Supabase settings: ${error.message}`)
      }
      
      if (!supabaseSettings) {
        return NextResponse.json({
          success: false,
          message: 'No settings found in Supabase to migrate'
        })
      }
      
      // Migrate to Redis
      const migrated = await redisSettingsService.migrateFromSupabase(supabaseSettings)
      
      return NextResponse.json({
        success: true,
        data: migrated,
        message: 'Settings migrated from Supabase to Redis successfully'
      })
    }
    
    if (pathname.endsWith('/reset')) {
      const settings = await redisSettingsService.resetSettings()
      return NextResponse.json({
        success: true,
        data: settings,
        message: 'Settings reset to defaults'
      })
    }
    
    if (pathname.endsWith('/restore')) {
      const settings = await redisSettingsService.restoreFromBackup()
      return NextResponse.json({
        success: true,
        data: settings,
        message: 'Settings restored from backup'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Settings Redis API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}