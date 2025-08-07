'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Package, Truck, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface POActivity {
  id: string
  po_number: string
  vendor_name: string
  total_amount: number
  status: string
  created_at: string
  item_count: number
  expected_delivery: string | null
}

interface POSummary {
  recentActivity: POActivity[]
  pipeline: {
    pending: number
    submitted: number
    approved: number
    received: number
    total: number
  }
  metrics: {
    averageProcessingTime: number
    totalPendingValue: number
    poCreatedThisWeek: number
    poCreatedThisMonth: number
  }
}

export default function POActivityTimeline() {
  const [summary, setSummary] = useState<POSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPOSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/po-summary?limit=8')
      if (!response.ok) throw new Error('Failed to fetch PO summary')
      const data = await response.json()
      setSummary(data.data || data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PO activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPOSummary()
    const interval = setInterval(fetchPOSummary, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'submitted':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />
      case 'approved':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'approved':
        return 'bg-purple-100 text-purple-800'
      case 'received':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Order Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Order Activity</h2>
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
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Order Activity</h2>
            <Link
              href="/purchase-orders"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>
          
          {/* Pipeline stats */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-yellow-600">{summary.pipeline.pending}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="text-lg font-semibold text-blue-600">{summary.pipeline.submitted}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Approved</p>
              <p className="text-lg font-semibold text-purple-600">{summary.pipeline.approved}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Received</p>
              <p className="text-lg font-semibold text-green-600">{summary.pipeline.received}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Metrics bar */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Avg Processing:</span>
                <span className="ml-1 font-semibold">{summary.metrics.averageProcessingTime.toFixed(1)} days</span>
              </div>
              <div>
                <span className="text-gray-500">Pending Value:</span>
                <span className="ml-1 font-semibold">${summary.metrics.totalPendingValue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">This Week:</span>
                <span className="ml-1 font-semibold">{summary.metrics.poCreatedThisWeek} POs</span>
              </div>
              <div>
                <span className="text-gray-500">This Month:</span>
                <span className="ml-1 font-semibold">{summary.metrics.poCreatedThisMonth} POs</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {summary.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No recent purchase orders</p>
              </div>
            ) : (
              summary.recentActivity.map((po, index) => (
                <div key={po.id} className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(po.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {po.po_number}
                      </Link>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {po.vendor_name} • {po.item_count} items • ${po.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(po.created_at).toLocaleDateString()}
                      {po.expected_delivery && (
                        <span className="ml-2">
                          <Truck className="inline h-3 w-3 mr-1" />
                          Expected: {new Date(po.expected_delivery).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}