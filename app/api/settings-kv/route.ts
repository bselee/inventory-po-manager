import { NextResponse } from 'next/server'
import { kvSettingsService } from '@/app/lib/kv-settings-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings-kv - Get settings from KV
export async function GET() {
  try {
    const settings = await kvSettingsService.getSettings()
    
    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('[Settings KV API] Error getting settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings-kv - Update settings in KV
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    // Validate settings
    const validation = kvSettingsService.validateSettings(body)
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
    const updated = await kvSettingsService.updateSettings(body)
    
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('[Settings KV API] Error updating settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings-kv/reset - Reset to defaults
export async function POST(request: Request) {
  try {
    const { pathname } = new URL(request.url)
    
    if (pathname.endsWith('/reset')) {
      const settings = await kvSettingsService.resetSettings()
      return NextResponse.json({
        success: true,
        data: settings,
        message: 'Settings reset to defaults'
      })
    }
    
    if (pathname.endsWith('/restore')) {
      const settings = await kvSettingsService.restoreFromBackup()
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
    console.error('[Settings KV API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}