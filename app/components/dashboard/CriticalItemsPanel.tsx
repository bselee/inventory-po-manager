'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface CriticalItem {
  id: string
  sku: string
  product_title: string
  available_quantity: number
  sales_velocity_30_day: number
  days_until_stockout: number
  reorder_point: number
  vendor_name: string | null
  status: 'critical' | 'low' | 'reorder_needed'
  action_required: string
}

export default function CriticalItemsPanel() {
  const [items, setItems] = useState<CriticalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCriticalItems = async () => {
    try {
      const response = await fetch('/api/dashboard/critical-items?limit=10')
      if (!response.ok) throw new Error('Failed to fetch critical items')
      const data = await response.json()
      setItems(data.data || data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load critical items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCriticalItems()
    const interval = setInterval(fetchCriticalItems, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'reorder_needed':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return 'CRITICAL'
      case 'low':
        return 'LOW STOCK'
      case 'reorder_needed':
        return 'REORDER'
      default:
        return status.toUpperCase()
    }
  }

  if (loading) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Critical Items</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Critical Items</h2>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-12 lg:col-span-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Critical Items
          </h2>
          <Link
            href="/inventory?filter=critical"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </div>
        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600">No critical items at this time</p>
              <p className="text-sm text-gray-500 mt-1">All inventory levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${getStatusColor(item.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{item.sku}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.status === 'critical' ? 'bg-red-600 text-white' :
                          item.status === 'low' ? 'bg-yellow-600 text-white' :
                          'bg-orange-600 text-white'
                        }`}>
                          {getStatusBadge(item.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-1">{item.product_title}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Stock: <strong>{item.available_quantity}</strong></span>
                        <span>Velocity: <strong>{item.sales_velocity_30_day.toFixed(1)}/day</strong></span>
                        <span className="text-red-600 font-semibold">
                          {item.days_until_stockout.toFixed(1)} days left
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-gray-600">
                        Vendor: {item.vendor_name || 'Unknown'}
                      </p>
                      <p className="text-xs mt-1 font-medium">{item.action_required}</p>
                    </div>
                    <Link
                      href={`/purchase-orders/new?vendor=${item.vendor_name}&items=${item.sku}`}
                      className="ml-2 p-2 bg-white rounded hover:bg-gray-50 transition-colors"
                      title="Create Purchase Order"
                    >
                      <ShoppingCart className="h-4 w-4 text-gray-600" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}