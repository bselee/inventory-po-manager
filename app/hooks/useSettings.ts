/**
 * Custom hooks for settings management
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getSettings,
  upsertSettings,
  getFinaleConfig,
  setSyncEnabled,
  Settings
} from '@/lib/data-access'

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
      setSettings(data || {
        id: 1,
        sync_enabled: false,
        email_alerts_enabled: false,
        low_stock_threshold: 10,
        auto_generate_po: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Settings)
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
      const updated = await upsertSettings({
        ...settings,
        ...updates
      })
      setSettings(updated)
      return updated
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