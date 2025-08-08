'use client'

import { useState, useEffect } from 'react'
import { Save, TestTube, Check, X, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { logger } from '@/app/lib/logger'

interface Settings {
  finale_api_key: string
  finale_api_secret: string
  finale_account_path: string
  sync_frequency_minutes: number
  sync_enabled: boolean
  low_stock_threshold: number
}

interface SyncStatus {
  lastSync: string | null
  nextSync: string | null
  isRunning: boolean
  itemsUpdated: number | null
  error: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    finale_api_key: '',
    finale_api_secret: '',
    finale_account_path: '',
    sync_frequency_minutes: 60,
    sync_enabled: true,
    low_stock_threshold: 10
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    loadSyncStatus()
    // Refresh sync status every 10 seconds
    const interval = setInterval(loadSyncStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/simple')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (error) {
      logger.error('Failed to load settings', error, 'SettingsPage')
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      logger.error('Failed to load sync status', error, 'SettingsPage')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    // Basic validation
    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      setMessage({ type: 'error', text: 'Please fill in all Finale API fields' })
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/settings/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      logger.error('Error saving settings', error, 'SettingsPage')
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setMessage(null)

    try {
      const response = await fetch('/api/test-finale-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.finale_api_key,
          apiSecret: settings.finale_api_secret,
          accountPath: settings.finale_account_path
        })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setTestResult('success')
        setMessage({ type: 'success', text: 'Connection successful! Finale API is working.' })
      } else {
        setTestResult('error')
        setMessage({ type: 'error', text: data.error || 'Connection failed' })
      }
    } catch (error) {
      logger.error('Connection test error', error, 'SettingsPage')
      setTestResult('error')
      setMessage({ type: 'error', text: 'Failed to test connection' })
    } finally {
      setTesting(false)
      // Clear test result after 5 seconds
      setTimeout(() => setTestResult(null), 5000)
    }
  }

  const triggerManualSync = async () => {
    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      setMessage({ type: 'error', text: 'Please configure and save Finale API settings first' })
      return
    }

    setSyncing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Sync started successfully! Check status below.' })
        // Refresh sync status immediately and after a few seconds
        loadSyncStatus()
        setTimeout(loadSyncStatus, 3000)
        setTimeout(loadSyncStatus, 6000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start sync' })
      }
    } catch (error) {
      logger.error('Manual sync error', error, 'SettingsPage')
      setMessage({ type: 'error', text: 'Failed to trigger manual sync' })
    } finally {
      setSyncing(false)
    }
  }

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-md flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Sync Status */}
      {syncStatus && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Sync Status</h2>
            <button
              onClick={loadSyncStatus}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${
                syncStatus.isRunning ? 'text-blue-600' : 
                syncStatus.error ? 'text-red-600' : 'text-green-600'
              }`}>
                {syncStatus.isRunning ? 'Running...' : 
                 syncStatus.error ? 'Error' : 'Idle'}
              </span>
            </div>
            
            {syncStatus.lastSync && (
              <div>
                <span className="text-gray-600">Last Sync:</span>
                <span className="ml-2">{new Date(syncStatus.lastSync).toLocaleString()}</span>
              </div>
            )}
            
            {syncStatus.nextSync && !syncStatus.isRunning && (
              <div>
                <span className="text-gray-600">Next Sync:</span>
                <span className="ml-2">{new Date(syncStatus.nextSync).toLocaleString()}</span>
              </div>
            )}
            
            {syncStatus.itemsUpdated !== null && (
              <div>
                <span className="text-gray-600">Items Updated:</span>
                <span className="ml-2">{syncStatus.itemsUpdated}</span>
              </div>
            )}
            
            {syncStatus.error && (
              <div className="col-span-2">
                <span className="text-gray-600">Error:</span>
                <span className="ml-2 text-red-600">{syncStatus.error}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={triggerManualSync}
              disabled={syncing || syncStatus.isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing || syncStatus.isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {syncStatus.isRunning ? 'Sync in Progress...' : 'Starting...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Manual Sync
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Finale API Configuration */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Finale API Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.finale_api_key}
                onChange={(e) => handleChange('finale_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Finale API Key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Finale: Settings → Integrations → Finale API
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={settings.finale_api_secret}
                onChange={(e) => handleChange('finale_api_secret', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Finale API Secret"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generated with your API Key in Finale
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Path
              </label>
              <input
                type="text"
                value={settings.finale_account_path}
                onChange={(e) => handleChange('finale_account_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., buildasoilorganics"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your account identifier from the Finale URL (e.g., if URL is 
                https://app.finaleinventory.com/buildasoilorganics/..., enter "buildasoilorganics")
              </p>
            </div>

            <button
              onClick={testConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult === 'success' ? (
                <Check className="h-4 w-4" />
              ) : testResult === 'error' ? (
                <X className="h-4 w-4" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sync Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Frequency
              </label>
              <select
                value={settings.sync_frequency_minutes}
                onChange={(e) => handleChange('sync_frequency_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={120}>Every 2 hours</option>
                <option value={240}>Every 4 hours</option>
                <option value={1440}>Once daily</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sync_enabled"
                checked={settings.sync_enabled}
                onChange={(e) => handleChange('sync_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sync_enabled" className="text-sm font-medium text-gray-700">
                Enable automatic sync
              </label>
            </div>

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
              <p className="text-xs text-gray-500 mt-1">
                Items at or below this quantity will be marked as low stock
              </p>
            </div>
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