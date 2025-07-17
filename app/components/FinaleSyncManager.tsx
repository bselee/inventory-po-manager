// app/components/FinaleSyncManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Info, Play, Loader2 } from 'lucide-react'

interface SyncStatus {
  configured: boolean
  lastSync?: string
  accountPath?: string
  error?: string
}

interface SyncResult {
  success: boolean
  totalProducts?: number
  processed?: number
  sample?: any[]
  dryRun?: boolean
  error?: string
  results?: any[]
}

export default function FinaleSyncManager() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'custom'>('current')
  const [customYear, setCustomYear] = useState(new Date().getFullYear())

  useEffect(() => {
    checkSyncStatus()
  }, [])

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-finale')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error checking sync status:', error)
    }
  }

  const performSync = async (dryRun = false) => {
    setSyncing(true)
    setSyncResult(null)

    // Determine filter year based on mode
    let filterYear: number | null | undefined
    if (filterMode === 'current') {
      filterYear = undefined // Use default (current year)
    } else if (filterMode === 'all') {
      filterYear = null // No filtering
    } else {
      filterYear = customYear // Use custom year
    }

    try {
      const response = await fetch('/api/sync-finale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, filterYear })
      })

      const result = await response.json()
      setSyncResult(result)

      // Refresh status after successful sync
      if (result.success && !dryRun) {
        await checkSyncStatus()
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: 'Failed to perform sync. Check console for details.'
      })
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (!status) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <RefreshCw className="h-5 w-5" />
        Finale Inventory Sync
      </h2>

      {/* Status Information */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          {status.configured ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm">
            Status: {status.configured ? 'Configured' : 'Not Configured'}
          </span>
        </div>

        {status.configured && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              Account: {status.accountPath}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              Last Sync: {formatDate(status.lastSync)}
            </div>
          </>
        )}
      </div>

      {/* Date Filter Options */}
      {status.configured && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Filter Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filterMode"
                value="current"
                checked={filterMode === 'current'}
                onChange={(e) => setFilterMode('current')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Current year only ({new Date().getFullYear()})</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filterMode"
                value="all"
                checked={filterMode === 'all'}
                onChange={(e) => setFilterMode('all')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">All products (no date filter)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filterMode"
                value="custom"
                checked={filterMode === 'custom'}
                onChange={(e) => setFilterMode('custom')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Custom year:</span>
              <input
                type="number"
                value={customYear}
                onChange={(e) => setCustomYear(parseInt(e.target.value) || new Date().getFullYear())}
                min="2000"
                max={new Date().getFullYear()}
                disabled={filterMode !== 'custom'}
                className="px-2 py-1 border border-gray-300 rounded text-sm w-20 disabled:bg-gray-100"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: This filters products by their last modified date in Finale
          </p>
        </div>
      )}

      {/* Sync Actions */}
      {status.configured ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => performSync(true)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Dry Run
            </button>
            <button
              onClick={() => performSync(false)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Now
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Dry Run will show what would be synced without making changes. 
            Use Sync Now to update your inventory data.
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            Please configure your Finale API credentials in the settings above before syncing.
          </p>
        </div>
      )}

      {/* Sync Results */}
      {syncResult && (
        <div className={`mt-6 p-4 rounded-md ${
          syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                syncResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
              </p>
              
              {syncResult.success && (
                <div className="mt-2 text-sm text-gray-700">
                  {syncResult.dryRun && (
                    <p className="font-medium text-amber-700 mb-2">
                      DRY RUN - No data was written
                    </p>
                  )}
                  <p>Total Products: {syncResult.totalProducts}</p>
                  {!syncResult.dryRun && (
                    <p>Processed: {syncResult.processed}</p>
                  )}
                </div>
              )}

              {syncResult.error && (
                <p className="mt-2 text-sm text-red-700">{syncResult.error}</p>
              )}

              {syncResult.sample && syncResult.sample.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDetails ? 'Hide' : 'Show'} Sample Data
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Sample of items to be synced:
                      </p>
                      <div className="space-y-2">
                        {syncResult.sample.map((item, idx) => (
                          <div key={idx} className="text-xs text-gray-600 border-b pb-1">
                            <span className="font-medium">{item.sku}</span> - {item.product_name}
                            <br />
                            Stock: {item.stock}, Cost: ${item.cost}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}