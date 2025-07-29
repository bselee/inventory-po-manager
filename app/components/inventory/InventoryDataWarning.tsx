import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface InventoryDataWarningProps {
  totalItems: number
  itemsWithSalesData: number
  itemsWithCost: number
  itemsWithVendor: number
  lastSyncDate?: string | null
}

export default function InventoryDataWarning({
  totalItems,
  itemsWithSalesData,
  itemsWithCost,
  itemsWithVendor,
  lastSyncDate
}: InventoryDataWarningProps) {
  const warnings: Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    details?: string
    action?: string
  }> = []

  // Check for empty inventory
  if (totalItems === 0) {
    warnings.push({
      type: 'error',
      message: 'No inventory data found',
      details: 'Your inventory appears to be empty.',
      action: 'Run a sync with Finale to import your inventory data.'
    })
  } else if (totalItems < 10) {
    warnings.push({
      type: 'warning',
      message: `Only ${totalItems} items found in inventory`,
      details: 'This seems like very little inventory data.',
      action: 'Check if your Finale sync completed successfully or if filters are applied.'
    })
  }

  // Check for missing sales data
  const salesDataPercentage = totalItems > 0 ? (itemsWithSalesData / totalItems) * 100 : 0
  if (totalItems > 0 && salesDataPercentage < 20) {
    warnings.push({
      type: 'warning',
      message: `${Math.round(100 - salesDataPercentage)}% of items missing sales data`,
      details: 'Sales velocity calculations will be inaccurate without sales data.',
      action: 'Upload sales data from Finale Excel reports to enable accurate analytics.'
    })
  }

  // Check for missing cost data
  const costDataPercentage = totalItems > 0 ? (itemsWithCost / totalItems) * 100 : 0
  if (totalItems > 0 && costDataPercentage < 50) {
    warnings.push({
      type: 'info',
      message: `${Math.round(100 - costDataPercentage)}% of items missing cost data`,
      details: 'Inventory value calculations may be incomplete.',
      action: 'Sync vendor data or update costs manually.'
    })
  }

  // Check for missing vendor data
  const vendorDataPercentage = totalItems > 0 ? (itemsWithVendor / totalItems) * 100 : 0
  if (totalItems > 0 && vendorDataPercentage < 30) {
    warnings.push({
      type: 'info',
      message: `${Math.round(100 - vendorDataPercentage)}% of items missing vendor information`,
      details: 'Vendor filtering and purchase order creation may be limited.',
      action: 'Run vendor sync or update vendor information in Finale.'
    })
  }

  // Check sync age
  if (lastSyncDate) {
    const lastSync = new Date(lastSyncDate)
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceSync > 48) {
      warnings.push({
        type: 'warning',
        message: `Data is ${Math.round(hoursSinceSync / 24)} days old`,
        details: `Last sync was on ${lastSync.toLocaleDateString()} at ${lastSync.toLocaleTimeString()}`,
        action: 'Run a sync to get the latest inventory data.'
      })
    }
  }

  if (warnings.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${
            warning.type === 'error'
              ? 'bg-red-50 border-red-200'
              : warning.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {warning.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : warning.type === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  warning.type === 'error'
                    ? 'text-red-800'
                    : warning.type === 'warning'
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}
              >
                {warning.message}
              </p>
              {warning.details && (
                <p
                  className={`text-sm mt-1 ${
                    warning.type === 'error'
                      ? 'text-red-700'
                      : warning.type === 'warning'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                  }`}
                >
                  {warning.details}
                </p>
              )}
              {warning.action && (
                <p
                  className={`text-sm mt-2 font-medium ${
                    warning.type === 'error'
                      ? 'text-red-800'
                      : warning.type === 'warning'
                      ? 'text-yellow-800'
                      : 'text-blue-800'
                  }`}
                >
                  Action: {warning.action}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}