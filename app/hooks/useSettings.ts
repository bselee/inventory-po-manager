/**
 * Custom hooks for settings management
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getSettings,
  upsertSettings,
  getFinaleConfig,
  setSyncEnabled
} from '@/app/lib/data-access/index'
import type { Settings } from '@/app/types/consolidated'

/**
 * Hook for managing application settings
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSettings()
      const defaultSettings: Settings = {
        id: 1,
        sync_enabled: false,
        email_alerts_enabled: false,
        low_stock_threshold: 10,
        auto_generate_po: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      // Convert SettingsRecord to Settings type
      const convertedData: Settings | null = data ? {
        id: parseInt(data.id) || 1,
        finale_api_key: data.finale_api_key || undefined,
        finale_api_secret: data.finale_api_secret || undefined,
        finale_account_path: data.finale_account_path || undefined,
        alert_email: data.alert_email || undefined,
        sendgrid_api_key: data.sendgrid_api_key || undefined,
        email_alerts_enabled: data.sendgrid_api_key ? true : false,
        sync_enabled: data.sync_enabled,
        last_sync_date: data.last_sync_date || undefined,
        low_stock_threshold: data.low_stock_threshold,
        auto_generate_po: false, // Default value since not in SettingsRecord
        created_at: data.created_at,
        updated_at: data.updated_at
      } : null
      
      setSettings(convertedData || defaultSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Save settings
  const saveSettings = useCallback(async (updates: Partial<Settings>) => {
    if (!settings) return

    try {
      setSaving(true)
      setError(null)
      // Convert Settings to SettingsRecord for the API
      const settingsRecord = {
        id: settings.id.toString(),
        finale_api_key: settings.finale_api_key || null,
        finale_api_secret: settings.finale_api_secret || null,
        finale_account_path: settings.finale_account_path || null,
        alert_email: settings.alert_email || null,
        sendgrid_api_key: settings.sendgrid_api_key || null,
        sync_enabled: settings.sync_enabled,
        last_sync_date: settings.last_sync_date || null,
        low_stock_threshold: settings.low_stock_threshold,
        created_at: settings.created_at,
        updated_at: new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            key,
            key === 'id' ? value?.toString() : value
          ])
        )
      }
      
      const updated = await upsertSettings(settingsRecord)
      
      // Convert back to Settings type
      const convertedUpdated: Settings = {
        id: parseInt(updated.id) || 1,
        finale_api_key: updated.finale_api_key || undefined,
        finale_api_secret: updated.finale_api_secret || undefined,
        finale_account_path: updated.finale_account_path || undefined,
        alert_email: updated.alert_email || undefined,
        sendgrid_api_key: updated.sendgrid_api_key || undefined,
        email_alerts_enabled: updated.sendgrid_api_key ? true : false,
        sync_enabled: updated.sync_enabled,
        last_sync_date: updated.last_sync_date || undefined,
        low_stock_threshold: updated.low_stock_threshold,
        auto_generate_po: settings.auto_generate_po,
        created_at: updated.created_at,
        updated_at: updated.updated_at
      }
      
      setSettings(convertedUpdated)
      return convertedUpdated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      throw err
    } finally {
      setSaving(false)
    }
  }, [settings])

  // Toggle sync
  const toggleSync = useCallback(async () => {
    if (!settings) return
    
    const newValue = !settings.sync_enabled
    await setSyncEnabled(newValue)
    setSettings({ ...settings, sync_enabled: newValue })
  }, [settings])

  // Test Finale connection
  const testFinaleConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/test-finale', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Connection test failed')
      }
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
      return false
    }
  }, [])

  return {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    saveSettings,
    toggleSync,
    testFinaleConnection
  }
}

/**
 * Hook for managing Finale API configuration
 */
export function useFinaleConfig() {
  const [config, setConfig] = useState<{
    apiKey: string
    apiSecret: string
    accountPath: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const finaleConfig = await getFinaleConfig()
        setConfig(finaleConfig)
      } catch (error) {
        console.error('Error loading Finale config:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { config, loading }
}

/**
 * Hook for managing settings form state
 */
export function useSettingsForm(initialSettings: Settings | null) {
  const [formData, setFormData] = useState({
    finale_api_key: '',
    finale_api_secret: '',
    finale_account_path: '',
    alert_email: '',
    sendgrid_api_key: '',
    email_alerts_enabled: false,
    sync_enabled: false,
    low_stock_threshold: 10,
    auto_generate_po: false
  })

  // Update form when settings load
  useEffect(() => {
    if (initialSettings) {
      setFormData({
        finale_api_key: initialSettings.finale_api_key || '',
        finale_api_secret: initialSettings.finale_api_secret || '',
        finale_account_path: initialSettings.finale_account_path || '',
        alert_email: initialSettings.alert_email || '',
        sendgrid_api_key: initialSettings.sendgrid_api_key || '',
        email_alerts_enabled: initialSettings.email_alerts_enabled || false,
        sync_enabled: initialSettings.sync_enabled || false,
        low_stock_threshold: initialSettings.low_stock_threshold || 10,
        auto_generate_po: initialSettings.auto_generate_po || false
      })
    }
  }, [initialSettings])

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    if (initialSettings) {
      setFormData({
        finale_api_key: initialSettings.finale_api_key || '',
        finale_api_secret: initialSettings.finale_api_secret || '',
        finale_account_path: initialSettings.finale_account_path || '',
        alert_email: initialSettings.alert_email || '',
        sendgrid_api_key: initialSettings.sendgrid_api_key || '',
        email_alerts_enabled: initialSettings.email_alerts_enabled || false,
        sync_enabled: initialSettings.sync_enabled || false,
        low_stock_threshold: initialSettings.low_stock_threshold || 10,
        auto_generate_po: initialSettings.auto_generate_po || false
      })
    }
  }, [initialSettings])

  return {
    formData,
    updateField,
    resetForm
  }
}