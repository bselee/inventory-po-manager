'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, Loader2, X } from 'lucide-react'
import { api } from '@/app/lib/client-fetch'

interface SyncSettings {
  sync_enabled?: boolean
  sync_frequency_minutes?: number
  inventory_data_source?: 'supabase' | 'redis-cache' | 'finale-cache' | 'enhanced'
}

interface Props {
  settings: SyncSettings
  onChange: (field: keyof SyncSettings, value: any) => void
}

export default function SyncSettingsSection({ settings, onChange }: Props) {
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadSyncStatus()
    
    if (autoRefresh) {
      const interval = setInterval(loadSyncStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadSyncStatus = async () => {
    try {
      const { data, error } = await api.get('/api/sync-status-monitor')
      if (data) {
        setSyncStatus(data)
      }
    } catch (error) {
      logError('Failed to load sync status:', error)
    }
  }

  const triggerManualSync = async () => {
    setSyncing(true)
    setMessage(null)

    try {
      const { data: result, error } = await api.post('/api/sync/manual', { force: true })

      if (error) {
        setMessage({
          type: 'error',
          text: error || 'Sync failed'
        })
      } else {
        setMessage({
          type: 'success',
          text: `Sync completed: ${result.itemsSynced || 0} items synced`
        })
        loadSyncStatus()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMessage({
        type: 'error',
        text: `Sync failed: ${errorMessage}`
      })
    } finally {
      setSyncing(false)
    }
  }

  const cleanupStuckSyncs = async () => {
    try {
      const { data: result, error } = await api.post('/api/sync-status-monitor')
      
      if (result?.cleaned > 0) {
        setMessage({
          type: 'success',
          text: `Cleaned up ${result.cleaned} stuck sync(s)`
        })
        loadSyncStatus()
      }
    } catch (error) {
      logError('Failed to cleanup stuck syncs:', error)
    }
  }

  const getSyncStatusIcon = () => {
    if (!syncStatus) return null
    
    if (syncStatus.hasRunningSync) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }
    
    if (syncStatus.hasStuckSync) {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
    
    if (syncStatus.lastSync?.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    
    if (syncStatus.lastSync?.status === 'failed') {
      return <X className="h-5 w-5 text-red-500" />
    }
    
    return <Clock className="h-5 w-5 text-gray-400" />
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Sync Configuration</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Auto-refresh status
          </label>
          <button
            onClick={triggerManualSync}
            disabled={syncing || syncStatus?.hasRunningSync}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
            ) : (
              <><Play className="h-4 w-4" /> Manual Sync</>
            )}
          </button>
        </div>
      </div>

      {/* Sync Status Display */}
      {syncStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getSyncStatusIcon()}
              <span className="font-medium text-gray-900">
                {syncStatus.hasRunningSync ? 'Sync in Progress' :
                 syncStatus.hasStuckSync ? 'Stuck Sync Detected' :
                 syncStatus.lastSync ? 'Last Sync' : 'No Recent Syncs'}
              </span>
            </div>
            {syncStatus.hasStuckSync && (
              <button
                onClick={cleanupStuckSyncs}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clean up stuck syncs
              </button>
            )}
          </div>
          
          {syncStatus.lastSync && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>Type: {syncStatus.lastSync.sync_type}</p>
              <p>Items: {syncStatus.lastSync.items_synced || 0} synced, {syncStatus.lastSync.items_failed || 0} failed</p>
              <p>Duration: {syncStatus.lastSync.duration || 0}s</p>
              <p>Started: {new Date(syncStatus.lastSync.started_at).toLocaleString()}</p>
            </div>
          )}
          
          {syncStatus.runningSync && (
            <div className="mt-2 text-sm text-blue-600">
              <p>Currently syncing: {syncStatus.runningSync.sync_type}</p>
              <p>Started: {new Date(syncStatus.runningSync.started_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sync_enabled || false}
              onChange={(e) => onChange('sync_enabled', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Automatic Sync</span>
          </label>
          <p className="ml-6 mt-1 text-xs text-gray-500">
            Automatically sync inventory data with Finale at regular intervals
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sync Frequency
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="5"
              max="1440"
              value={settings.sync_frequency_minutes || 60}
              onChange={(e) => onChange('sync_frequency_minutes', parseInt(e.target.value) || 60)}
              disabled={!settings.sync_enabled}
              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            How often to sync with Finale (minimum 5 minutes)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Data Source
          </label>
          <select
            value={settings.inventory_data_source || 'supabase'}
            onChange={(e) => onChange('inventory_data_source', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="supabase">Supabase Database (Default)</option>
            <option value="redis-cache">Redis Cache (Fastest)</option>
            <option value="finale-cache">Finale Cache Service</option>
            <option value="enhanced">Enhanced Multi-Source</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose where inventory data is loaded from
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Sync Options</h3>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Sync inventory levels</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Sync purchase orders</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Sync vendor data</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={false}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Skip discontinued items</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}