'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Clock, CheckCircle, AlertCircle, Calendar, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

interface SyncSettings {
  sync_enabled: boolean
  sync_inventory: boolean
  sync_vendors: boolean
  sync_purchase_orders: boolean
  sync_schedule: 'hourly' | 'daily' | 'weekly' | 'manual'
  sync_time: string // HH:MM format
  last_inventory_sync?: string
  last_vendor_sync?: string
  last_po_sync?: string
}

interface SyncLog {
  id: string
  sync_type: string
  status: 'success' | 'error' | 'running'
  items_processed?: number
  items_updated?: number
  errors?: string[]
  duration_ms?: number
  synced_at: string
}

export default function SyncControlPanel() {
  const [settings, setSettings] = useState<SyncSettings>({
    sync_enabled: true,
    sync_inventory: true,
    sync_vendors: true,
    sync_purchase_orders: true,
    sync_schedule: 'daily',
    sync_time: '02:00' // 2 AM default
  })
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    loadRecentLogs()
    
    // Refresh logs every 30 seconds
    const interval = setInterval(loadRecentLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/sync')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading sync settings:', error)
    }
  }

  const loadRecentLogs = async () => {
    try {
      const response = await fetch('/api/sync-logs?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading sync logs:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Sync settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      alert('Error saving settings')
      console.error('Error saving sync settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const runManualSync = async (syncType: 'inventory' | 'vendors' | 'purchase_orders') => {
    setSyncing(syncType)
    try {
      const response = await fetch(`/api/sync-${syncType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`${syncType} sync completed successfully`)
        loadRecentLogs()
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      alert(`Error syncing ${syncType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncing(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="space-y-6">
      {/* Main Sync Control */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync Control Center
        </h2>

        {/* Master Switch */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Master Sync Control</h3>
              <p className="text-sm text-gray-600">Enable or disable all automatic syncing</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, sync_enabled: !prev.sync_enabled }))}
              className="text-4xl"
            >
              {settings.sync_enabled ? (
                <ToggleRight className="h-8 w-8 text-green-600" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Individual Sync Controls */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Sync Types</h3>
          
          {/* Inventory Sync */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Inventory</p>
                <p className="text-sm text-gray-600">
                  Last sync: {formatDate(settings.last_inventory_sync)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  sync_inventory: !prev.sync_inventory 
                }))}
                disabled={!settings.sync_enabled}
              >
                {settings.sync_inventory ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => runManualSync('inventory')}
                disabled={syncing !== null}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {syncing === 'inventory' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sync Now'
                )}
              </button>
            </div>
          </div>

          {/* Vendors Sync */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Vendors</p>
                <p className="text-sm text-gray-600">
                  Last sync: {formatDate(settings.last_vendor_sync)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  sync_vendors: !prev.sync_vendors 
                }))}
                disabled={!settings.sync_enabled}
              >
                {settings.sync_vendors ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => runManualSync('vendors')}
                disabled={syncing !== null}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {syncing === 'vendors' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sync Now'
                )}
              </button>
            </div>
          </div>

          {/* Purchase Orders Sync */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Purchase Orders</p>
                <p className="text-sm text-gray-600">
                  Last sync: {formatDate(settings.last_po_sync)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  sync_purchase_orders: !prev.sync_purchase_orders 
                }))}
                disabled={!settings.sync_enabled}
              >
                {settings.sync_purchase_orders ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => runManualSync('purchase_orders')}
                disabled={syncing !== null}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {syncing === 'purchase_orders' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sync Now'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Settings */}
        <div className="mt-6 space-y-4">
          <h3 className="font-medium text-gray-700">Schedule Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Frequency
              </label>
              <select
                value={settings.sync_schedule}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  sync_schedule: e.target.value as any 
                }))}
                disabled={!settings.sync_enabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Time (for daily)
              </label>
              <input
                type="time"
                value={settings.sync_time}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  sync_time: e.target.value 
                }))}
                disabled={!settings.sync_enabled || settings.sync_schedule !== 'daily'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Recent Sync History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Sync History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Type</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Duration</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2 capitalize">{log.sync_type}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' :
                      log.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status === 'success' && <CheckCircle className="h-3 w-3" />}
                      {log.status === 'error' && <AlertCircle className="h-3 w-3" />}
                      {log.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {log.items_updated || 0} / {log.items_processed || 0}
                  </td>
                  <td className="py-2">{formatDuration(log.duration_ms)}</td>
                  <td className="py-2 text-xs text-gray-600">
                    {new Date(log.synced_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {recentLogs.length === 0 && (
            <p className="text-center py-4 text-gray-500">No sync history available</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Add missing imports
import { Package, Users, FileText } from 'lucide-react'