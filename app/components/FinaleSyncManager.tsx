// app/components/FinaleSyncManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Info, Play, Loader2 } from 'lucide-react'
import { api } from '@/app/lib/client-fetch'

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
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'custom' | 'two-years'>('two-years')
  const [customYear, setCustomYear] = useState(new Date().getFullYear())
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncProgress, setSyncProgress] = useState<string>('')

  useEffect(() => {
    checkSyncStatus()
  }, [refreshKey])

  // Check for settings changes every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkSyncStatus()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const checkSyncStatus = async () => {
    try {
      // Check if Finale is configured by verifying credentials
      const verifyResponse = await fetch('/api/finale-verify')
      const verifyData = await verifyResponse.json()
      
      if (verifyData.credentials?.hasKey && verifyData.credentials?.hasSecret && verifyData.credentials?.accountPath) {
        setStatus({
          configured: true,
          accountPath: verifyData.credentials.accountPath,
          lastSync: null
        })
      } else {
        setStatus({
          configured: false,
          error: 'Missing credentials'
        })
      }
    } catch (error) {
      console.error('Error checking sync status:', error)
      setStatus({
        configured: false,
        error: 'Failed to check status'
      })
    }
  }

  const performSync = async (dryRun = false) => {
    setSyncing(true)
    setSyncResult(null)
    setSyncProgress(dryRun ? 'Starting dry run...' : 'Connecting to Finale...')

    // Determine filter year based on mode
    let filterYear: number | null | undefined
    if (filterMode === 'current') {
      filterYear = new Date().getFullYear() // Current year only
    } else if (filterMode === 'two-years') {
      filterYear = new Date().getFullYear() - 1 // Last 2 years (will get current year - 1 and newer)
    } else if (filterMode === 'all') {
      filterYear = null // No filtering (all historical data)
    } else {
      filterYear = customYear // Use custom year
    }

    try {
      setSyncProgress(dryRun ? 'Testing connection...' : 'Starting background sync...')
      
      // Use the background sync endpoint
      const response = await fetch('/api/sync-finale-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, filterYear })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      setSyncResult(result)
      setSyncProgress('')
      
      // For non-dry runs, start polling for status
      if (!dryRun && result.success) {
        setSyncProgress('Sync running in background...')
        pollSyncStatus()
      }

      // Refresh status after successful sync
      if (result.success && !dryRun) {
        await checkSyncStatus()
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform sync. Check console for details.'
      })
      setSyncProgress('')
    } finally {
      setSyncing(false)
      setSyncProgress('')
    }
  }

  const pollSyncStatus = async () => {
    let pollCount = 0
    const maxPolls = 60 // Poll for up to 5 minutes (every 5 seconds)
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/sync-finale-background')
        const status = await response.json()
        
        if (!status.hasRunningSync || pollCount >= maxPolls) {
          clearInterval(interval)
          setSyncProgress('')
          
          if (status.lastSync?.status === 'success') {
            const itemsProcessed = status.lastSync.items_processed || 0
            const itemsUpdated = status.lastSync.items_updated || 0
            
            setSyncResult({
              success: true,
              totalProducts: itemsProcessed,
              processed: itemsUpdated,
              message: itemsUpdated > 0 
                ? `Sync completed! ${itemsUpdated} items imported.`
                : 'Sync completed. No new items found for the selected time period.'
            })
            
            // Only redirect if items were actually imported
            if (itemsUpdated > 0) {
              setTimeout(() => {
                window.location.href = '/inventory'
              }, 2000)
            }
          } else if (status.lastSync?.status === 'error') {
            setSyncResult({
              success: false,
              error: `Sync failed: ${status.lastSync.errors?.[0] || 'Unknown error'}`
            })
          } else if (pollCount >= maxPolls) {
            setSyncResult({
              success: false,
              error: 'Sync is taking longer than expected. Check back later.'
            })
          }
        } else {
          setSyncProgress(`Sync running in background... (${Math.floor(pollCount * 5 / 60)}:${String((pollCount * 5) % 60).padStart(2, '0')})`)
        }
        
        pollCount++
      } catch (error) {
        clearInterval(interval)
        setSyncProgress('')
      }
    }, 5000) // Poll every 5 seconds
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
        Sync Control Center - Import Inventory from Finale
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
                value="two-years"
                checked={filterMode === 'two-years'}
                onChange={(e) => setFilterMode('two-years')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-green-700">Last 2 years ({new Date().getFullYear() - 1}-{new Date().getFullYear()}) - ✓ RECOMMENDED FOR INITIAL SYNC</span>
            </label>
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
              <span className="text-sm">All historical records (no date filter) - May be very large</span>
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
            Note: This filters products by their last modified date in Finale. 
            The "Last 2 years" option provides enough historical data for calculations and forecasting
            while keeping sync times reasonable.
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

          {syncProgress && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                <p className="text-sm text-yellow-800 font-medium">{syncProgress}</p>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>To sync your inventory:</strong> Select "Last 2 years" (recommended) and click "Sync Now". 
              This will import 2 years of data for sales calculations and forecasting. 
              The sync typically takes 1-3 minutes.
            </p>
          </div>
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