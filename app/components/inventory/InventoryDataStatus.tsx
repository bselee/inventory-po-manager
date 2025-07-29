import { Package, AlertCircle, CheckCircle, RefreshCw, TrendingUp } from 'lucide-react'

interface InventoryDataStatusProps {
  totalItems: number
  itemsWithCost: number
  itemsWithVendor: number
  totalValue?: number
  lastSyncDate?: string | null
  onSync?: () => void
}

export default function InventoryDataStatus({
  totalItems,
  itemsWithCost,
  itemsWithVendor,
  totalValue = 0,
  lastSyncDate,
  onSync
}: InventoryDataStatusProps) {
  // Calculate data completeness
  const costCompleteness = totalItems > 0 ? Math.round((itemsWithCost / totalItems) * 100) : 0
  const vendorCompleteness = totalItems > 0 ? Math.round((itemsWithVendor / totalItems) * 100) : 0
  
  // Check sync freshness
  const syncAge = lastSyncDate ? 
    Math.round((Date.now() - new Date(lastSyncDate).getTime()) / (1000 * 60 * 60)) : null

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Inventory Overview
        </h3>
        {onSync && (
          <button
            onClick={onSync}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Sync with Finale
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems.toLocaleString()}</p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Cost Data</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-gray-900">{costCompleteness}%</p>
            {costCompleteness > 80 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Last Sync</p>
          <p className="text-sm font-medium text-gray-900">
            {syncAge !== null ? (
              syncAge < 1 ? 'Just now' :
              syncAge < 24 ? `${syncAge}h ago` :
              `${Math.round(syncAge / 24)}d ago`
            ) : 'Never'}
          </p>
        </div>
      </div>
      
      {totalItems === 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            No inventory data found. Click "Sync with Finale" to import your inventory.
          </p>
        </div>
      )}
      
      {totalItems > 0 && costCompleteness < 50 && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Tip: {100 - costCompleteness}% of items are missing cost data. 
            Update costs in Finale for accurate inventory valuation.
          </p>
        </div>
      )}
    </div>
  )
}