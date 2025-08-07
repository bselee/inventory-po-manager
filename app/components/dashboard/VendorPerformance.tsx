'use client'

import { useEffect, useState } from 'react'
import { Award, AlertCircle, TrendingUp, Clock } from 'lucide-react'

interface VendorStat {
  id: string
  name: string
  totalOrders: number
  totalSpent: number
  averageLeadTime: number
  onTimeDeliveryRate: number
  itemsSuppiled: number
  lastOrderDate: string | null
}

interface VendorStats {
  topVendors: VendorStat[]
  performanceMetrics: {
    bestLeadTime: { vendor: string, days: number }
    mostReliable: { vendor: string, onTimeRate: number }
    highestVolume: { vendor: string, orders: number }
    mostCriticalSupplier: { vendor: string, criticalItems: number }
  }
  alerts: {
    vendor: string
    issue: string
    severity: 'high' | 'medium' | 'low'
  }[]
}

export default function VendorPerformance() {
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'metrics'>('table')

  const fetchVendorStats = async () => {
    try {
      const response = await fetch('/api/dashboard/vendor-stats?limit=5')
      if (!response.ok) throw new Error('Failed to fetch vendor stats')
      const data = await response.json()
      setStats(data.data || data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendor stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendorStats()
    const interval = setInterval(fetchVendorStats, 120000) // Refresh every 2 minutes
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="col-span-12">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Performance</h2>
          </div>
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="col-span-12">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Performance</h2>
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
    <div className="col-span-12">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Performance</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setView('table')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Top Vendors
              </button>
              <button
                onClick={() => setView('metrics')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'metrics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Performance Metrics
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Alerts */}
          {stats.alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {stats.alerts.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    alert.severity === 'high' ? 'bg-red-50 text-red-800' :
                    alert.severity === 'medium' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-blue-50 text-blue-800'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">{alert.vendor}:</span> {alert.issue}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      On-Time Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.topVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          {vendor.lastOrderDate && (
                            <div className="text-xs text-gray-500">
                              Last order: {new Date(vendor.lastOrderDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {vendor.totalOrders}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        ${vendor.totalSpent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {vendor.averageLeadTime.toFixed(1)} days
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            vendor.onTimeDeliveryRate >= 90 ? 'text-green-600' :
                            vendor.onTimeDeliveryRate >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {vendor.onTimeDeliveryRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {vendor.itemsSuppiled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Best Lead Time */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Fastest Delivery</span>
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.performanceMetrics.bestLeadTime.vendor}
                </p>
                <p className="text-sm text-gray-500">
                  Avg: {stats.performanceMetrics.bestLeadTime.days.toFixed(1)} days
                </p>
              </div>

              {/* Most Reliable */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Most Reliable</span>
                  <Award className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.performanceMetrics.mostReliable.vendor}
                </p>
                <p className="text-sm text-gray-500">
                  On-time: {stats.performanceMetrics.mostReliable.onTimeRate}%
                </p>
              </div>

              {/* Highest Volume */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Highest Volume</span>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.performanceMetrics.highestVolume.vendor}
                </p>
                <p className="text-sm text-gray-500">
                  {stats.performanceMetrics.highestVolume.orders} orders
                </p>
              </div>

              {/* Most Critical */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Critical Supplier</span>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.performanceMetrics.mostCriticalSupplier.vendor}
                </p>
                <p className="text-sm text-gray-500">
                  {stats.performanceMetrics.mostCriticalSupplier.criticalItems} critical items
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}