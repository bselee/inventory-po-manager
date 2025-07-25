/**
 * Data Access Layer for Settings Operations
 * Centralizes all database queries related to application settings
 */

import { supabase } from '@/app/lib/supabase'

export interface Settings {
  id: number
  finale_api_key: string | null
  finale_api_secret: string | null
  finale_account_path: string | null
  last_sync_date: string | null
  sync_enabled: boolean
  alert_email: string | null
  sendgrid_api_key: string | null
  email_alerts_enabled: boolean
  low_stock_threshold: number
  auto_generate_po: boolean
  created_at: string
  updated_at: string
}

/**
 * Get application settings (single row with id=1)
 */
export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`)
  }

  return data
}

/**
 * Create or update settings (upsert)
 */
export async function upsertSettings(settings: Partial<Settings>): Promise<Settings> {
  const updateData = {
    ...settings,
    id: 1, // Always use id=1 for settings
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('settings')
    .upsert(updateData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`)
  }

  return data
}

/**
 * Update specific setting fields
 */
export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`)
  }

  return data
}

/**
 * Get Finale API configuration
 */
export async function getFinaleConfig() {
  const settings = await getSettings()
  
  // Check environment variables first, then database settings
  const apiKey = process.env.FINALE_API_KEY || settings?.finale_api_key
  const apiSecret = process.env.FINALE_API_SECRET || settings?.finale_api_secret
  const accountPath = process.env.FINALE_ACCOUNT_PATH || settings?.finale_account_path

  if (!apiKey || !apiSecret || !accountPath) {
    return null
  }

  return {
    apiKey,
    apiSecret,
    accountPath
  }
}

/**
 * Get email alert configuration
 */
export async function getEmailConfig() {
  const settings = await getSettings()
  
  const sendgridApiKey = process.env.SENDGRID_API_KEY || settings?.sendgrid_api_key
  const alertEmail = settings?.alert_email
  const emailAlertsEnabled = settings?.email_alerts_enabled ?? false

  if (!sendgridApiKey || !alertEmail || !emailAlertsEnabled) {
    return null
  }

  return {
    sendgridApiKey,
    alertEmail,
    emailAlertsEnabled
  }
}

/**
 * Update last sync date
 */
export async function updateLastSyncDate(date: Date = new Date()): Promise<void> {
  await updateSettings({
    last_sync_date: date.toISOString()
  })
}

/**
 * Check if sync is enabled
 */
export async function isSyncEnabled(): Promise<boolean> {
  const settings = await getSettings()
  return settings?.sync_enabled ?? false
}

/**
 * Enable or disable sync
 */
export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await updateSettings({ sync_enabled: enabled })
}