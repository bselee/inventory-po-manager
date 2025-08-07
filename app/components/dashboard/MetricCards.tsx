'use client'

import { useEffect, useState } from 'react'
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  Clock,
  Activity,
  CheckCircle
} from 'lucide-react'

interface Metrics {
  totalInventoryValue: number
  totalSKUs: number
  criticalItems: number
  lowStockItems: number
  healthyItems: number
  overstockedItems: number
  averageSalesVelocity: number
  totalPendingPOs: number
  lastSyncTime: string | null
}

export default function MetricCards() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data.data || data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="col-span-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="col-span-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading metrics: {error}</p>
        </div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Inventory Value',
      value: `$${metrics.totalInventoryValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600 bg-green-100',
      trend: null
    },
    {
      title: 'Total SKUs',
      value: metrics.totalSKUs.toLocaleString(),
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
      trend: null
    },
    {
      title: 'Critical Items',
      value: metrics.criticalItems.toString(),
      icon: AlertTriangle,
      color: metrics.criticalItems > 0 ? 'text-red-600 bg-red-100' : 'text-gray-600 bg-gray-100',
      trend: metrics.criticalItems > 0 ? 'Needs attention' : 'All good'
    },
    {
      title: 'Low Stock Items',
      value: metrics.lowStockItems.toString(),
      icon: Activity,
      color: 'text-yellow-600 bg-yellow-100',
      trend: null
    },
    {
      title: 'Healthy Stock',
      value: metrics.healthyItems.toString(),
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
      trend: `${Math.round((metrics.healthyItems / metrics.totalSKUs) * 100)}% of inventory`
    },
    {
      title: 'Avg Sales Velocity',
      value: metrics.averageSalesVelocity.toFixed(1),
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
      trend: 'units/day'
    },
    {
      title: 'Pending POs',
      value: metrics.totalPendingPOs.toString(),
      icon: ShoppingCart,
      color: 'text-indigo-600 bg-indigo-100',
      trend: null
    },
    {
      title: 'Last Sync',
      value: metrics.lastSyncTime 
        ? new Date(metrics.lastSyncTime).toLocaleTimeString()
        : 'Never',
      icon: Clock,
      color: 'text-gray-600 bg-gray-100',
      trend: metrics.lastSyncTime 
        ? new Date(metrics.lastSyncTime).toLocaleDateString()
        : null
    }
  ]

  return (
    <div className="col-span-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                  {card.trend && (
                    <p className="mt-1 text-xs text-gray-500">{card.trend}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}