'use client'

import { useState } from 'react'
import { Users, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SyncResult {
  success: boolean
  totalVendors?: number
  processed?: number
  error?: string
}

export default function VendorSyncManager() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const syncVendors = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/sync-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()
      setSyncResult(result)
    } catch (error) {
      setSyncResult({
        success: false,
        error: 'Failed to sync vendors. Check console for details.'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Vendor Sync
      </h2>

      <p className="text-sm text-gray-600 mb-4">
        Sync vendor information from Finale to use when creating purchase orders.
        This will update vendor names, contact info, and IDs.
      </p>

      <button
        onClick={syncVendors}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync Vendors from Finale
      </button>

      {syncResult && (
        <div className={`mt-4 p-4 rounded-md ${
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
                {syncResult.success ? 'Vendor Sync Successful' : 'Vendor Sync Failed'}
              </p>
              
              {syncResult.success && (
                <div className="mt-2 text-sm text-gray-700">
                  <p>Total Vendors: {syncResult.totalVendors}</p>
                  <p>Processed: {syncResult.processed}</p>
                </div>
              )}

              {syncResult.error && (
                <p className="mt-2 text-sm text-red-700">{syncResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}