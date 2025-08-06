import React from 'react'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Cloud, 
  CloudOff,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { Vendor } from '@/lib/data-access/vendors'

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

interface EnhancedVendorCardProps {
  vendor: VendorStats['vendor']
  stats?: VendorStats
  isLoading?: boolean
}

export default function EnhancedVendorCard({ 
  vendor, 
  stats, 
  isLoading = false
}: EnhancedVendorCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleViewInventory = (vendorName: string) => {
    const encodedVendor = encodeURIComponent(vendorName)
    window.open(`/inventory?vendor=${encodedVendor}`, '_blank')
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-gray-400" />
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {vendor.name}
              {vendor.finale_vendor_id ? (
                <span title="Synced with Finale">
                  <Cloud className="h-4 w-4 text-green-500" />
                </span>
              ) : (
                <span title="Local only">
                  <CloudOff className="h-4 w-4 text-gray-400" />
                </span>
              )}
            </h3>
            {vendor.finale_vendor_id && (
              <p className="text-xs text-gray-500">Finale ID: {vendor.finale_vendor_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        {vendor.contact_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Contact:</span> {vendor.contact_name}
          </div>
        )}
        {vendor.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
              {vendor.email}
            </a>
          </div>
        )}
        {vendor.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">
              {vendor.phone}
            </a>
          </div>
        )}
        {vendor.address && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-line">{vendor.address}</span>
          </div>
        )}
        {vendor.notes && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-line">{vendor.notes}</span>
          </div>
        )}
      </div>

      {/* Statistics */}
      {isLoading ? (
        <div className="space-y-4">
          {/* Key Metrics Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-6 bg-gray-300 rounded animate-pulse w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
          
          {/* Inventory Health Skeleton */}
          <div className="border-t pt-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Order Status Skeleton */}
          <div className="border-t pt-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse w-20"></div>
              ))}
            </div>
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-700 mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">Items</span>
              </div>
              <div className="text-lg font-semibold">{stats.totalItems}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">Orders</span>
              </div>
              <div className="text-lg font-semibold">{stats.totalPurchaseOrders}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-700 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Total Spend</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(stats.totalSpend)}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-700 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Last Order</span>
              </div>
              <div className="text-sm font-semibold">{formatDate(stats.lastOrderDate)}</div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Inventory Health</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-green-700">In Stock</span>
                <span className="font-semibold text-green-800">{stats.inventoryStats.inStockItems}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-yellow-700">Low Stock</span>
                <span className="font-semibold text-yellow-800">{stats.inventoryStats.lowStockItems}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-red-700">Out of Stock</span>
                <span className="font-semibold text-red-800">{stats.inventoryStats.outOfStockItems}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-blue-700">Fast Moving</span>
                <span className="font-semibold text-blue-800">{stats.inventoryStats.fastMovingItems}</span>
              </div>
            </div>
          </div>

          {/* Order Status */}
          {stats.totalPurchaseOrders > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Order Status</span>
              </div>
              <div className="flex gap-2 text-xs">
                {stats.ordersByStatus.draft > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                    <span className="text-gray-700">Draft:</span>
                    <span className="font-semibold">{stats.ordersByStatus.draft}</span>
                  </div>
                )}
                {stats.ordersByStatus.submitted > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded">
                    <span className="text-blue-700">Submitted:</span>
                    <span className="font-semibold">{stats.ordersByStatus.submitted}</span>
                  </div>
                )}
                {stats.ordersByStatus.approved > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded">
                    <span className="text-green-700">Approved:</span>
                    <span className="font-semibold">{stats.ordersByStatus.approved}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Insights */}
          <div className="border-t pt-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {stats.inventoryStats.totalValue > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                  <DollarSign className="h-3 w-3 text-purple-700" />
                  <span className="text-purple-700">Inventory Value: {formatCurrency(stats.inventoryStats.totalValue)}</span>
                </div>
              )}
              {stats.averageOrderValue > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded">
                  <TrendingUp className="h-3 w-3 text-indigo-700" />
                  <span className="text-indigo-700">Avg Order: {formatCurrency(stats.averageOrderValue)}</span>
                </div>
              )}
              {(stats.inventoryStats.lowStockItems > 0 || stats.inventoryStats.outOfStockItems > 0) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded">
                  <AlertTriangle className="h-3 w-3 text-red-700" />
                  <span className="text-red-700">
                    {stats.inventoryStats.lowStockItems + stats.inventoryStats.outOfStockItems} items need attention
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4">
          No statistics available
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => handleViewInventory(vendor.name)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title={`View inventory items from ${vendor.name}`}
        >
          <Package className="h-4 w-4" />
          View Inventory ({stats?.totalItems || 0} items)
        </button>
      </div>
    </div>
  )
}
