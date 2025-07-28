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
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Parse Google Sheet ID from URL
  const parseGoogleSheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    loadSyncStatus()
    
    // Set up auto-refresh for sync status
    if (autoRefresh) {
      const interval = setInterval(loadSyncStatus, 10000) // Every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Load sync status
  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-status-monitor')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  // Clean up stuck syncs
  const cleanupStuckSyncs = async () => {
    try {
      setMessage({ type: 'success', text: 'Checking for stuck sync operations...' })
      
      const response = await fetch('/api/sync-status-monitor', { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message + (result.stuckSyncs > 0 ? ` (${result.stuckSyncs} operations cleaned)` : '')
        })
        // Refresh sync status after cleanup
        setTimeout(loadSyncStatus, 1000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to cleanup stuck syncs' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cleanup stuck syncs' })
    }
  }

  const loadSettings = async () => {
    try {
      // First try to load from database via Supabase (for now, keep this for backward compatibility)
      const { data: dbSettings, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Database load error:', error)
      }

      if (dbSettings) {
        setSettings(dbSettings)
        // Set the Google Sheet URL if we have an ID
        if (dbSettings.google_sheet_id) {
          setGoogleSheetUrl(dbSettings.google_sheet_id)
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
            
            // Use the API route to save settings
            const saveResponse = await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(initialSettings)
            })
            
            if (saveResponse.ok) {
              const result = await saveResponse.json()
              if (result.data?.settings) {
                setSettings(prev => ({
                  ...prev,
                  ...result.data.settings,
                  id: prev.id
                }))
              }
              setMessage({ 
                type: 'success', 
                text: 'Environment credentials loaded and saved automatically!' 
              })
            } else {
              console.error('Auto-save failed')
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
      console.log('Saving settings via API:', settings)
      
      // Prepare the settings data for the API
      const settingsData = {
        finale_api_key: settings.finale_api_key || null,
        finale_api_secret: settings.finale_api_secret || null,
        finale_account_path: settings.finale_account_path || null,
        finale_username: settings.finale_username || null,
        finale_password: settings.finale_password || null,
        google_sheet_id: settings.google_sheet_id || null,
        google_sheets_api_key: settings.google_sheets_api_key || null,
        sendgrid_api_key: settings.sendgrid_api_key || null,
        from_email: settings.from_email || null,
        alert_email: settings.from_email || null, // Using from_email as alert_email
        low_stock_threshold: settings.low_stock_threshold || 10,
        sync_frequency_minutes: settings.sync_frequency_minutes || 60,
        sync_enabled: settings.sync_enabled !== false,
        email_alerts_enabled: !!settings.sendgrid_api_key,
        auto_generate_po: false // Default value, can be made configurable later
      }
      
      // Use the API route instead of direct Supabase access
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      console.log('Settings saved successfully via API:', result)
      
      // Update local state with the returned settings
      if (result.data?.settings) {
        setSettings(prev => ({
          ...prev,
          ...result.data.settings,
          id: prev.id // Preserve the ID
        }))
      }
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      
      // Refresh sync status after saving settings
      setTimeout(loadSyncStatus, 1000)
    } catch (error) {
      console.error('Error saving settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMessage({ type: 'error', text: `Failed to save settings: ${errorMessage}` })
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
    setMessage(null) // Clear previous messages

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

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      let result
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        result = {
          success: false,
          error: `Server returned non-JSON response (${response.status}): ${text.substring(0, 200)}...`
        }
      }

      setTestResults(prev => ({ ...prev, [service]: result.success ? 'success' : 'error' }))

      if (!result.success) {
        // Enhanced error messaging
        let errorMessage = result.error || `Failed to connect to ${service}`
        
        // Add helpful hints for common errors
        if (errorMessage.includes('404')) {
          errorMessage += '. Check if the API endpoint exists or account path is correct.'
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMessage += '. Check your API credentials.'
        } else if (errorMessage.includes('credentials')) {
          errorMessage += '. Please verify your API settings.'
        }

        setMessage({ type: 'error', text: errorMessage })
        
        // Log debug info for troubleshooting
        if (result.debug) {
          console.error(`${service} connection debug info:`, result.debug)
        }
      } else {
        // Success message with helpful details
        let successMessage = result.message || `${service} connection successful`
        
        if (result.results?.recommendations?.length > 0) {
          successMessage += `. ${result.results.recommendations[0]}`
        }
        
        setMessage({ type: 'success', text: successMessage })
        
        // Log success details
        if (result.debug) {
          console.log(`${service} connection debug info:`, result.debug)
        }
        if (result.results) {
          console.log(`${service} test results:`, result.results)
        }
      }
    } catch (error) {
      console.error(`Connection test error for ${service}:`, error)
      setTestResults(prev => ({ ...prev, [service]: 'error' }))
      
      let errorMessage = `Network error testing ${service} connection`
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage += '. Check your internet connection or server availability.'
        } else {
          errorMessage += `: ${error.message}`
        }
      }
      
      setMessage({ type: 'error', text: errorMessage })
    }
  }

  const triggerManualSync = async () => {
    if (!settings.finale_account_path || !settings.finale_username || !settings.finale_password) {
      setMessage({ 
        type: 'error', 
        text: 'Please configure and test Finale credentials before starting a sync.' 
      })
      return
    }

    setMessage({ type: 'success', text: 'Starting manual sync...' })

    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Manual sync started successfully! Check sync status below for progress.' 
        })
        // Refresh sync status immediately and then every few seconds
        loadSyncStatus()
        setTimeout(loadSyncStatus, 3000)
        setTimeout(loadSyncStatus, 6000)
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to start sync: ${result.error || 'Unknown error'}` 
        })
      }
    } catch (error) {
      console.error('Manual sync trigger error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMessage({ 
        type: 'error', 
        text: `Failed to trigger manual sync: ${errorMessage}` 
      })
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

      {/* Error/Success Message for Playwright */}
      {message && (
        <div
          data-testid={message.type === 'error' ? 'error-message' : 'success-message'}
          className={`mb-6 p-4 rounded-md flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
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

      {/* Real-time Sync Status */}
      {syncStatus && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Loader2 className="h-5 w-5" />
              Sync Status Monitor
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 text-xs rounded ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={loadSyncStatus}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Refresh Now
              </button>
              <button
                onClick={triggerManualSync}
                className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Start Manual Sync
              </button>
            </div>
          </div>
          
          {/* Running Syncs */}
          {syncStatus.runningSyncs?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Currently Running:</h3>
              <div className="space-y-2">
                {syncStatus.runningSyncs.map((sync: any) => (
                  <div 
                    key={sync.id} 
                    className={`flex items-center justify-between p-3 rounded ${
                      sync.isStuck ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {sync.isStuck ? (
                        <X className="h-4 w-4 text-red-600" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      )}
                      <div>
                        <div className="font-medium text-sm">
                          {sync.sync_type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-600">
                          Running for {Math.floor(sync.runtime / 60)}m {sync.runtime % 60}s
                          {sync.isStuck && ' - STUCK!'}
                        </div>
                      </div>
                    </div>
                    {sync.isStuck && (
                      <button
                        onClick={cleanupStuckSyncs}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Clean Up
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Syncs */}
          {syncStatus.recentSyncs?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Recent Activity:</h3>
              <div className="space-y-1">
                {syncStatus.recentSyncs.slice(0, 3).map((sync: any) => (
                  <div key={sync.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      {sync.status === 'success' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : sync.status === 'error' ? (
                        <X className="h-3 w-3 text-red-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                      )}
                      <span className="font-medium">{sync.sync_type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {sync.items_updated || 0} items • {sync.duration_ms ? `${Math.round(sync.duration_ms / 1000)}s` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {syncStatus.totalRunning === 0 && (!syncStatus.recentSyncs || syncStatus.recentSyncs.length === 0) && (
            <div className="text-center py-4 text-gray-500">
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No sync activity detected</p>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
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
              <label htmlFor="sync_frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Sync Frequency
              </label>
              <select
                id="sync_frequency"
                value={settings.sync_frequency_minutes || 60}
                onChange={(e) => handleChange('sync_frequency_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select sync frequency"
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
            <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <input
              id="low_stock_threshold"
              data-testid="setting-input"
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => handleChange('low_stock_threshold', parseInt(e.target.value) || 10)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Low stock threshold"
            />
            <p className="text-sm text-gray-500 mt-1">
              Items with stock at or below this level will be marked as low stock
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            data-testid="save-settings"
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