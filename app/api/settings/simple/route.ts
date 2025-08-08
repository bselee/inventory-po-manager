import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config({ path: '.env' })

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Settings file path - stores in project root
const SETTINGS_FILE = path.join(process.cwd(), '.settings.json')

interface Settings {
  finale_api_key: string
  finale_api_secret: string
  finale_account_path: string
  sync_frequency_minutes: number
  sync_enabled: boolean
  low_stock_threshold: number
}

// Default settings
const DEFAULT_SETTINGS: Settings = {
  finale_api_key: process.env.FINALE_API_KEY || '',
  finale_api_secret: process.env.FINALE_API_SECRET || '',
  finale_account_path: process.env.FINALE_ACCOUNT_PATH || '',
  sync_frequency_minutes: 60,
  sync_enabled: true,
  low_stock_threshold: 10
}

async function loadSettings(): Promise<Settings> {
  try {
    // Try to load from file first
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const savedSettings = JSON.parse(fileContent)
    
    // Merge with defaults (in case new fields were added)
    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings
    }
  } catch (error) {
    // File doesn't exist or is invalid, return defaults
    return DEFAULT_SETTINGS
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw new Error('Failed to save settings to file')
  }
}

// GET /api/settings/simple - Load settings
export async function GET() {
  try {
    const settings = await loadSettings()
    
    // Don't send raw API secrets to frontend, just indicate if they're set
    const safeSettings = {
      ...settings,
      finale_api_key: settings.finale_api_key ? '***' + settings.finale_api_key.slice(-4) : '',
      finale_api_secret: settings.finale_api_secret ? '***' + settings.finale_api_secret.slice(-4) : ''
    }
    
    return NextResponse.json({ settings: safeSettings })
  } catch (error) {
    console.error('Error loading settings:', error)
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings/simple - Save settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.finale_api_key || !body.finale_api_secret || !body.finale_account_path) {
      return NextResponse.json(
        { error: 'Missing required Finale API fields' },
        { status: 400 }
      )
    }
    
    // Load current settings to preserve API keys if they're masked
    const currentSettings = await loadSettings()
    
    // Only update API keys if they're not masked values
    const settings: Settings = {
      finale_api_key: body.finale_api_key.startsWith('***') 
        ? currentSettings.finale_api_key 
        : body.finale_api_key,
      finale_api_secret: body.finale_api_secret.startsWith('***') 
        ? currentSettings.finale_api_secret 
        : body.finale_api_secret,
      finale_account_path: body.finale_account_path,
      sync_frequency_minutes: body.sync_frequency_minutes || 60,
      sync_enabled: body.sync_enabled !== false,
      low_stock_threshold: body.low_stock_threshold || 10
    }
    
    // Save to file
    await saveSettings(settings)
    
    // Return success with safe settings
    const safeSettings = {
      ...settings,
      finale_api_key: settings.finale_api_key ? '***' + settings.finale_api_key.slice(-4) : '',
      finale_api_secret: settings.finale_api_secret ? '***' + settings.finale_api_secret.slice(-4) : ''
    }
    
    return NextResponse.json({ 
      success: true,
      settings: safeSettings 
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    )
  }
}

// Export function to get settings for other API routes
export async function getFinaleSettings(): Promise<Settings | null> {
  try {
    return await loadSettings()
  } catch (error) {
    console.error('Failed to load Finale settings:', error)
    return null
  }
}