'use client'

import { useState } from 'react'
import { Upload, RefreshCw, CheckCircle, AlertCircle, Loader2, Link2 } from 'lucide-react'

interface FinalePOSyncProps {
  purchaseOrderId: string
  orderNumber: string
  finaleOrderId?: string | null
  finaleSyncStatus?: string | null
  onSyncComplete?: () => void
}

export default function FinalePOSync({ 
  purchaseOrderId, 
  orderNumber,
  finaleOrderId,
  finaleSyncStatus,
  onSyncComplete 
}: FinalePOSyncProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
    finaleOrderId?: string
  } | null>(null)

  const syncToFinale = async (action: 'create' | 'update' | 'status') => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/purchase-orders/sync-finale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          purchaseOrderId,
          action 
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSyncResult({
          success: true,
          message: result.message,
          finaleOrderId: result.finaleOrderId
        })
        
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else {
        setSyncResult({
          success: false,
          message: result.error || 'Sync failed'
        })
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Failed to sync with Finale'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getSyncStatusDisplay = () => {
    if (!finaleSyncStatus || finaleSyncStatus === 'not_synced') {
      return {
        icon: <Upload className="h-4 w-4" />,
        text: 'Not synced to Finale',
        color: 'text-gray-600'
      }
    } else if (finaleSyncStatus === 'synced') {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Synced to Finale',
        color: 'text-green-600'
      }
    } else {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Sync error',
        color: 'text-red-600'
      }
    }
  }

  const status = getSyncStatusDisplay()

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gray-600" />
          <span className="font-medium">Finale Integration</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${status.color}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
      </div>

      {finaleOrderId && (
        <div className="mb-3 text-sm text-gray-600">
          Finale Order ID: <span className="font-mono">{finaleOrderId}</span>
        </div>
      )}

      <div className="flex gap-2">
        {!finaleOrderId ? (
          <button
            onClick={() => syncToFinale('create')}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Create in Finale
          </button>
        ) : (
          <>
            <button
              onClick={() => syncToFinale('update')}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Update in Finale
            </button>
            <button
              onClick={() => syncToFinale('status')}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
            >
              Check Status
            </button>
          </>
        )}
      </div>

      {syncResult && (
        <div className={`mt-3 p-3 rounded-md text-sm ${
          syncResult.success 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {syncResult.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p>{syncResult.message}</p>
              {syncResult.finaleOrderId && (
                <p className="mt-1 text-xs">
                  Finale Order ID: {syncResult.finaleOrderId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}