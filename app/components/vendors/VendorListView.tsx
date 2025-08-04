'use client'

import { Vendor } from '@/app/lib/data-access/vendors'
import { ExternalLink, Mail, Phone, MapPin, Package, ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ErrorBoundary, { DefaultErrorFallback } from '@/app/components/common/ErrorBoundary'

interface VendorStats {
  vendor: Vendor
  totalItems: number
  totalPurchaseOrders: number
  totalSpend: number
  averageOrderValue: number
  lastOrderDate: string | null
  ordersByStatus: {
    draft: number
    submitted: number
    approved: number
  }
  inventoryStats: {
    totalValue: number
    lowStockItems: number
    outOfStockItems: number
    fastMovingItems: number
    inStockItems: number
  }
}

interface VendorListViewProps {
  vendors: Vendor[]
  vendorStats: Record<string, VendorStats>
  loadingStats: Record<string, boolean>
  sortField?: 'name' | 'totalItems' | 'totalSpend' | 'lastOrderDate'
  sortDirection?: 'asc' | 'desc'
  onSort?: (field: 'name' | 'totalItems' | 'totalSpend' | 'lastOrderDate') => void
}

export default function VendorListView({ vendors, vendorStats, loadingStats, sortField, sortDirection, onSort }: VendorListViewProps) {
  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <VendorListTable 
        vendors={vendors} 
        vendorStats={vendorStats} 
        loadingStats={loadingStats} 
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </ErrorBoundary>
  )
}

function VendorListTable({ vendors, vendorStats, loadingStats, sortField, sortDirection, onSort }: VendorListViewProps) {
  const router = useRouter()

  const handleViewInventory = (vendor: Vendor) => {
    router.push(`/inventory?vendor=${encodeURIComponent(vendor.name)}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('name')}
              >
                <div className="flex items-center gap-1">
                  Vendor
                  {sortField === 'name' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('totalItems')}
              >
                <div className="flex items-center gap-1">
                  Inventory
                  {sortField === 'totalItems' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Orders
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('totalSpend')}
              >
                <div className="flex items-center gap-1">
                  Spend
                  {sortField === 'totalSpend' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.map((vendor) => {
              const stats = vendorStats[vendor.id]
              const isLoading = loadingStats[vendor.id]

              return (
                <tr key={vendor.id} className="hover:bg-gray-50" data-vendor-id={vendor.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.name}
                      </div>
                      {vendor.address && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {vendor.address.substring(0, 50)}{vendor.address.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {vendor.contact_name && (
                        <div className="text-sm text-gray-900">{vendor.contact_name}</div>
                      )}
                      {vendor.email && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <a 
                            href={`mailto:${vendor.email}`}
                            className="hover:text-blue-600"
                          >
                            {vendor.email}
                          </a>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a 
                            href={`tel:${vendor.phone}`}
                            className="hover:text-blue-600"
                          >
                            {vendor.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
                      </div>
                    ) : stats ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-gray-900">
                          {stats.totalItems} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.inventoryStats.inStockItems} in stock
                        </div>
                        {stats.inventoryStats.lowStockItems > 0 && (
                          <div className="text-xs text-yellow-700">
                            {stats.inventoryStats.lowStockItems} low stock
                          </div>
                        )}
                        {stats.inventoryStats.outOfStockItems > 0 && (
                          <div className="text-xs text-red-700">
                            {stats.inventoryStats.outOfStockItems} out of stock
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No data</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
                      </div>
                    ) : stats ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-gray-900">
                          {stats.totalPurchaseOrders} orders
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.ordersByStatus.draft} draft, {stats.ordersByStatus.submitted} submitted
                        </div>
                        {stats.lastOrderDate && (
                          <div className="text-xs text-gray-500">
                            Last: {new Date(stats.lastOrderDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No data</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
                      </div>
                    ) : stats ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(stats.totalSpend)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {formatCurrency(stats.averageOrderValue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Inventory: {formatCurrency(stats.inventoryStats.totalValue)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No data</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewInventory(vendor)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        title="View Inventory"
                      >
                        <Package className="h-3 w-3" />
                        <span>View Inventory</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {vendors.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No vendors found
        </div>
      )}
    </div>
  )
}
