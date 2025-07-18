'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Save, TestTube, Check, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import FinaleSyncManager from '@/app/components/FinaleSyncManager'
import SalesDataUploader from '@/app/components/SalesDataUploader'
import VendorSyncManager from '@/app/components/VendorSyncManager'
import FinaleDebugPanel from '@/app/components/FinaleDebugPanel'
import SyncControlPanel from '@/app/components/SyncControlPanel'

interface Settings {
  id?: string
  finale_api_key?: string
  finale_api_secret?: string
  finale_username?: string
  finale_password?: string
  finale_account_path?: string
  google_sheet_id?: string
  google_sheets_api_key?: string
  sendgrid_api_key?: string
  from_email?: string
  low_stock_threshold: number
  sync_frequency_minutes?: number
  sync_enabled?: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    low_stock_threshold: 10,
    sync_frequency_minutes: 60,
    sync_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')

  // Parse Google Sheet ID from URL
  const parseGoogleSheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

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
        // Set the Google Sheet URL if we have an ID
        if (data.google_sheet_id) {
          setGoogleSheetUrl(data.google_sheet_id)
        }
      } else {
        // No settings found, try to load from env and auto-save
        const envResponse = await fetch('/api/load-env-settings')
        const envData = await envResponse.json()
        
        if (!envData.hasSettings && envData.envSettings) {
          // Use env settings as defaults
          const initialSettings = {
            finale_api_key: envData.envSettings.finale_api_key || '',
            finale_api_secret: envData.envSettings.finale_api_secret || '',
            finale_account_path: envData.envSettings.finale_account_path || '',
            low_stock_threshold: 10,
            sync_frequency_minutes: 60,
            sync_enabled: true
          }
          
          setSettings(initialSettings)
          
          // Auto-save if we have credentials
          if (envData.envSettings.finale_api_key) {
            console.log('Auto-saving environment credentials...')
            
            try {
              // First try to get existing settings
              const { data: existingSettings } = await supabase
                .from('settings')
                .select('*')
                .limit(1)
                .single()
              
              const upsertPayload = existingSettings 
                ? { id: existingSettings.id, ...initialSettings }
                : { ...initialSettings }
              
              const { data, error } = await supabase
                .from('settings')
                .upsert(upsertPayload)
                .select()
                .single()
              
              if (!error && data) {
                setSettings(data)
                setMessage({ 
                  type: 'success', 
                  text: 'Environment credentials loaded and saved automatically!' 
                })
              }
            } catch (autoSaveError) {
              console.error('Auto-save failed:', autoSaveError)
              setMessage({ 
                type: 'success', 
                text: 'Loaded credentials from environment. Click Save to store them.' 
              })
            }
          }
        }
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
      console.log('Saving settings:', settings)
      
      // Use upsert to handle both insert and update
      const upsertData: any = {
        finale_api_key: settings.finale_api_key || '',
        finale_api_secret: settings.finale_api_secret || '',
        finale_account_path: settings.finale_account_path || '',
        finale_username: settings.finale_username || '',
        finale_password: settings.finale_password || '',
        google_sheet_id: settings.google_sheet_id || '',
        google_sheets_api_key: settings.google_sheets_api_key || '',
        sendgrid_api_key: settings.sendgrid_api_key || '',
        from_email: settings.from_email || '',
        low_stock_threshold: settings.low_stock_threshold || 10,
        sync_frequency_minutes: settings.sync_frequency_minutes || 60,
        sync_enabled: settings.sync_enabled !== false
      }
      
      // Add id if it exists
      if (settings.id) {
        upsertData.id = settings.id
      }
      
      const { data, error } = await supabase
        .from('settings')
        .upsert(upsertData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Settings saved successfully:', data)
      setSettings(data)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: `Failed to save settings: ${error.message}` })
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
        'finale': '/api/finale-auth-test', // Comprehensive auth testing
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
        // Show debug info if available
        if (result.debug) {
          console.error(`${service} connection debug info:`, result.debug)
        }
        if (result.results) {
          console.log(`${service} authentication test results:`, result.results)
        }
        setMessage({ type: 'error', text: result.error || `Failed to connect to ${service}` })
      } else {
        // Show debug info for successful connections too
        if (result.debug) {
          console.log(`${service} connection debug info:`, result.debug)
        }
        if (result.results) {
          console.log(`${service} authentication test results:`, result.results)
          // Show recommendations if available
          if (result.results.recommendations?.length > 0) {
            setMessage({ 
              type: 'success', 
              text: `${result.message}. ${result.results.recommendations[0]}` 
            })
          } else {
            setMessage({ type: 'success', text: result.message || `${service} connection successful` })
          }
        } else {
          setMessage({ type: 'success', text: result.message || `${service} connection successful` })
        }
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
      
      {/* Getting Started Guide */}
      {!settings.id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Configure your <strong>Finale API credentials</strong> below to sync inventory data</li>
            <li>Test the connection to ensure credentials are correct</li>
            <li>Run your first sync using the Finale Sync Manager</li>
            <li>Upload sales data from your Finale Excel reports</li>
            <li>Configure email settings if you want to send purchase orders</li>
          </ol>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-start gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            <p className="font-medium">{message.text}</p>
            {message.type === 'error' && message.text.includes('fetch failed') && (
              <p className="text-sm mt-1">
                This usually means the credentials are incorrect or the account path is wrong. 
                Please double-check your API settings in Finale.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Temporary Fix Button for Multiple Settings Issue */}
      {message?.text?.includes('multiple') || message?.text?.includes('not configured') ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-3">
            Detected multiple settings records. Click below to fix this issue:
          </p>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/fix-settings', { method: 'POST' })
                const data = await response.json()
                if (data.success) {
                  setMessage({ type: 'success', text: 'Settings fixed! Please reload the page.' })
                  setTimeout(() => window.location.reload(), 2000)
                } else {
                  setMessage({ type: 'error', text: data.error || 'Failed to fix settings' })
                }
              } catch (error) {
                setMessage({ type: 'error', text: 'Failed to fix settings' })
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Fix Settings Issue
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Finale Inventory */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Finale Inventory Integration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Connect to your Finale Inventory account for comprehensive two-way integration:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
            <li><strong>Inventory Monitoring:</strong> Real-time stock levels, out-of-stock alerts, and analysis</li>
            <li><strong>Purchase Orders:</strong> Create POs here and sync directly to Finale</li>
            <li><strong>Vendor Data:</strong> Sync supplier information and costs</li>
            <li><strong>Automated Updates:</strong> Hourly sync keeps data current</li>
          </ul>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Find in Finale: Settings → Integrations → Finale API
              </p>
              <input
                type="password"
                value={settings.finale_api_key || ''}
                onChange={(e) => handleChange('finale_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1234567890abcdef"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Generated with your API Key in Finale
              </p>
              <input
                type="password"
                value={settings.finale_api_secret || ''}
                onChange={(e) => handleChange('finale_api_secret', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., abcdef1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Path
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Your account identifier from the URL. If your Finale URL is 
                https://app.finaleinventory.com/buildasoilorganics/sc2/, 
                enter "buildasoilorganics" (NOT "app" or the full URL)
              </p>
              <input
                type="text"
                value={settings.finale_account_path || ''}
                onChange={(e) => handleChange('finale_account_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., yourcompany"
              />
            </div>
            
            {/* Alternative Authentication Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Alternative: Username/Password Authentication
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                If you don't have API keys, you can use your Finale username and password. 
                This is useful for accessing reports and legacy integrations.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.finale_username || ''}
                    onChange={(e) => handleChange('finale_username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Finale username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={settings.finale_password || ''}
                    onChange={(e) => handleChange('finale_password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Finale password"
                  />
                </div>
              </div>
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
            
            {/* Debug Panel */}
            <FinaleDebugPanel settings={settings} />
          </div>
        </div>

        {/* Sync Control Panel - Master Sync Controls */}
        <SyncControlPanel />

        {/* Finale Sync Manager */}
        <FinaleSyncManager />

        {/* Vendor Sync Manager */}
        <VendorSyncManager />

        {/* Sales Data Upload */}
        <SalesDataUploader />

        {/* Sync Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sync Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Frequency
              </label>
              <select
                value={settings.sync_frequency_minutes || 60}
                onChange={(e) => handleChange('sync_frequency_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour (recommended)</option>
                <option value={120}>Every 2 hours</option>
                <option value={240}>Every 4 hours</option>
                <option value={1440}>Once daily</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                How often to automatically sync inventory data from Finale
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sync_enabled"
                checked={settings.sync_enabled !== false}
                onChange={(e) => handleChange('sync_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sync_enabled" className="text-sm font-medium text-gray-700">
                Enable automatic sync
              </label>
            </div>
          </div>
        </div>

        {/* Google Sheets */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Google Sheets Export</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure Google Sheets integration to export inventory data, purchase orders, and reports. 
            This allows you to share data with team members and create custom reports in Google Sheets.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This integration is for exporting data from the app to Google Sheets. 
              To import sales data from Finale reports, use the Sales Data Upload feature above.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheet URL or ID
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Paste your entire Google Sheets URL or just the Sheet ID
              </p>
              <input
                type="text"
                value={googleSheetUrl || settings.google_sheet_id || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setGoogleSheetUrl(value)
                  
                  // Try to parse ID from URL
                  const parsedId = parseGoogleSheetId(value)
                  if (parsedId) {
                    handleChange('google_sheet_id', parsedId)
                  } else if (!value.includes('docs.google.com')) {
                    // If it's not a URL, assume it's already an ID
                    handleChange('google_sheet_id', value)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0.../edit or just the ID"
              />
              {googleSheetUrl && parseGoogleSheetId(googleSheetUrl) && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Sheet ID detected: {parseGoogleSheetId(googleSheetUrl)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Generate from Google Cloud Console → APIs & Services → Credentials
              </p>
              <input
                type="password"
                value={settings.google_sheets_api_key || ''}
                onChange={(e) => handleChange('google_sheets_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AIzaSyDj4k3Kj4k3jK4k3jK4k3jK4k3jK4k3jK4"
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
          <p className="text-sm text-gray-600 mb-4">
            Configure SendGrid to automatically send purchase orders to vendors via email. 
            Purchase orders can be sent as PDF attachments with customizable email templates.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SendGrid API Key
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Get from SendGrid Dashboard → Settings → API Keys
              </p>
              <input
                type="password"
                value={settings.sendgrid_api_key || ''}
                onChange={(e) => handleChange('sendgrid_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Must be a verified sender in SendGrid
              </p>
              <input
                type="email"
                value={settings.from_email || ''}
                onChange={(e) => handleChange('from_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="purchasing@yourcompany.com"
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