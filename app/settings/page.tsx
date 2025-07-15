'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Save, TestTube, Check, X, Loader2 } from 'lucide-react'
import FinaleSyncManager from '@/app/components/FinaleSyncManager'

interface Settings {
  id?: string
  finale_api_key?: string
  finale_api_secret?: string
  finale_account_path?: string
  google_sheet_id?: string
  google_sheets_api_key?: string
  sendgrid_api_key?: string
  from_email?: string
  low_stock_threshold: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    low_stock_threshold: 10
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('settings')
          .update({
            finale_api_key: settings.finale_api_key,
            finale_api_secret: settings.finale_api_secret,
            finale_account_path: settings.finale_account_path,
            google_sheet_id: settings.google_sheet_id,
            google_sheets_api_key: settings.google_sheets_api_key,
            sendgrid_api_key: settings.sendgrid_api_key,
            from_email: settings.from_email,
            low_stock_threshold: settings.low_stock_threshold
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('settings')
          .insert({
            finale_api_key: settings.finale_api_key,
            finale_api_secret: settings.finale_api_secret,
            finale_account_path: settings.finale_account_path,
            google_sheet_id: settings.google_sheet_id,
            google_sheets_api_key: settings.google_sheets_api_key,
            sendgrid_api_key: settings.sendgrid_api_key,
            from_email: settings.from_email,
            low_stock_threshold: settings.low_stock_threshold
          })
          .select()
          .single()

        if (error) throw error
        if (data) setSettings(data)
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testConnection = async (service: string) => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }))

    try {
      // Map service names to their specific endpoints
      const endpointMap: Record<string, string> = {
        'finale': '/api/test-finale',
        'google-sheets': '/api/test-sheets',
        'sendgrid': '/api/test-sendgrid'
      }

      const response = await fetch(endpointMap[service] || `/api/test-connection/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const result = await response.json()
      setTestResults(prev => ({ ...prev, [service]: result.success ? 'success' : 'error' }))

      if (!result.success) {
        setMessage({ type: 'error', text: result.error || `Failed to connect to ${service}` })
      } else {
        setMessage({ type: 'success', text: result.message || `${service} connection successful` })
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [service]: 'error' }))
      setMessage({ type: 'error', text: `Failed to test ${service} connection` })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Finale Inventory */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Finale Inventory</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.finale_api_key || ''}
                onChange={(e) => handleChange('finale_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Finale API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={settings.finale_api_secret || ''}
                onChange={(e) => handleChange('finale_api_secret', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Finale API secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Path
              </label>
              <input
                type="text"
                value={settings.finale_account_path || ''}
                onChange={(e) => handleChange('finale_account_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., yourcompany.finale.io"
              />
            </div>
            <button
              onClick={() => testConnection('finale')}
              disabled={testResults.finale === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testResults.finale === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.finale === 'success' ? (
                <Check className="h-4 w-4" />
              ) : testResults.finale === 'error' ? (
                <X className="h-4 w-4" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test Connection
            </button>
          </div>
        </div>

        {/* Finale Sync Manager */}
        <FinaleSyncManager />

        {/* Google Sheets */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Google Sheets</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sheet ID
              </label>
              <input
                type="text"
                value={settings.google_sheet_id || ''}
                onChange={(e) => handleChange('google_sheet_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Google Sheet ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.google_sheets_api_key || ''}
                onChange={(e) => handleChange('google_sheets_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Google Sheets API key"
              />
            </div>
            <button
              onClick={() => testConnection('google-sheets')}
              disabled={testResults['google-sheets'] === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testResults['google-sheets'] === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults['google-sheets'] === 'success' ? (
                <Check className="h-4 w-4" />
              ) : testResults['google-sheets'] === 'error' ? (
                <X className="h-4 w-4" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test Connection
            </button>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Email Settings (SendGrid)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SendGrid API Key
              </label>
              <input
                type="password"
                value={settings.sendgrid_api_key || ''}
                onChange={(e) => handleChange('sendgrid_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your SendGrid API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={settings.from_email || ''}
                onChange={(e) => handleChange('from_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <button
              onClick={() => testConnection('sendgrid')}
              disabled={testResults.sendgrid === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testResults.sendgrid === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.sendgrid === 'success' ? (
                <Check className="h-4 w-4" />
              ) : testResults.sendgrid === 'error' ? (
                <X className="h-4 w-4" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test Connection
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => handleChange('low_stock_threshold', parseInt(e.target.value) || 10)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Items with stock at or below this level will be marked as low stock
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}