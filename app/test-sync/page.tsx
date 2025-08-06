'use client'

import { useState } from 'react'

export default function TestSyncPage() {
  const [syncResult, setSyncResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setSyncResult(null)

    try {
      // First check if Finale is configured
      const verifyResponse = await fetch('/api/finale-verify')
      const verifyData = await verifyResponse.json()
      
      if (!verifyData.credentials?.hasKey || !verifyData.credentials?.hasSecret || !verifyData.credentials?.accountPath) {
        throw new Error('Finale credentials not configured. Please configure in Settings page.')
      }

      console.log('Starting sync with year filter:', new Date().getFullYear() - 1)
      
      // Start the sync
      const response = await fetch('/api/sync-finale-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: false,
          filterYear: new Date().getFullYear() - 1 // Last 2 years
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      setSyncResult(result)
      
      // If sync started, poll for status
      if (result.success && !result.dryRun) {
        pollSyncStatus()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      logError('Sync error:', err)
    } finally {
      setLoading(false)
    }
  }

  const pollSyncStatus = async () => {
    let pollCount = 0
    const maxPolls = 60 // 5 minutes
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/sync-finale-background')
        const status = await response.json()
        
        if (!status.hasRunningSync || pollCount >= maxPolls) {
          clearInterval(interval)
          
          if (status.lastSync?.status === 'success') {
            const itemsUpdated = status.lastSync.items_updated || 0
            setSyncResult((prev: any) => ({
              ...prev,
              completed: true,
              itemsUpdated,
              message: itemsUpdated > 0 
                ? `✅ Sync completed! ${itemsUpdated} items imported.`
                : '⚠️ Sync completed but no new items found.'
            }))
          } else if (status.lastSync?.status === 'error') {
            setError(`Sync failed: ${status.lastSync.errors?.[0] || 'Unknown error'}`)
          }
        }
        
        pollCount++
      } catch (error) {
        clearInterval(interval)
        logError('Poll error:', error)
      }
    }, 5000)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Finale Sync</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Direct Sync Control</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          This is a test page to directly trigger Finale inventory sync.
        </p>

        <button
          onClick={handleSync}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Syncing...' : 'Sync Now (Last 2 Years)'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {syncResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 font-medium">
              {syncResult.message || '✅ Sync started successfully!'}
            </p>
            {syncResult.status && (
              <p className="text-sm text-gray-600 mt-1">Status: {syncResult.status}</p>
            )}
            {!syncResult.completed && (
              <p className="text-sm text-gray-600 mt-2">
                ⏳ Sync is running in background... Check back in a few minutes.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p>After sync completes:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Go to <a href="/inventory" className="text-blue-600 hover:underline">Inventory page</a> to see your data</li>
            <li>Check <a href="/settings" className="text-blue-600 hover:underline">Settings page</a> for sync status</li>
          </ul>
        </div>
      </div>
    </div>
  )
}