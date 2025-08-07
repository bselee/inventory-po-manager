'use client'

import { useEffect, useState } from 'react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendData {
  date: string
  inventoryValue: number
  salesVelocity: number
  stockHealth: number
  criticalItems: number
}

interface TrendAnalysis {
  daily: TrendData[]
  weekly: TrendData[]
  monthly: TrendData[]
  predictions: {
    nextWeekVelocity: number
    nextMonthCriticalItems: number
    stockHealthTrend: 'improving' | 'stable' | 'declining'
  }
}

export default function TrendCharts() {
  const [trends, setTrends] = useState<TrendAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [metric, setMetric] = useState<'value' | 'velocity' | 'health'>('value')

  const fetchTrends = async () => {
    try {
      const response = await fetch('/api/dashboard/trends?period=90')
      if (!response.ok) throw new Error('Failed to fetch trends')
      const data = await response.json()
      setTrends(data.data || data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
    const interval = setInterval(fetchTrends, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !trends) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const data = trends[period]
  const formatDate = (date: string) => {
    const d = new Date(date)
    if (period === 'daily') {
      return `${d.getMonth() + 1}/${d.getDate()}`
    } else if (period === 'weekly') {
      return `Week ${d.getMonth() + 1}/${d.getDate()}`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short' })
    }
  }

  const formattedData = data.map(item => ({
    ...item,
    date: formatDate(item.date),
    inventoryValue: Math.round(item.inventoryValue),
    salesVelocity: Math.round(item.salesVelocity * 10) / 10
  }))

  return (
    <div className="col-span-12 lg:col-span-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Trends</h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      period === p
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Predictions */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Stock Health:</span>
              {getTrendIcon(trends.predictions.stockHealthTrend)}
              <span className="font-medium">
                {trends.predictions.stockHealthTrend}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Next Week Velocity:</span>
              <span className="font-medium ml-1">
                {trends.predictions.nextWeekVelocity.toFixed(1)} units/day
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Tab buttons for different metrics */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMetric('value')}
              className={`px-3 py-1 text-sm rounded ${
                metric === 'value'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inventory Value
            </button>
            <button
              onClick={() => setMetric('velocity')}
              className={`px-3 py-1 text-sm rounded ${
                metric === 'velocity'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sales Velocity
            </button>
            <button
              onClick={() => setMetric('health')}
              className={`px-3 py-1 text-sm rounded ${
                metric === 'health'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Stock Health
            </button>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={250}>
            {metric === 'value' ? (
              <AreaChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Area 
                  type="monotone" 
                  dataKey="inventoryValue" 
                  stroke="#3B82F6" 
                  fill="#93C5FD"
                  name="Inventory Value"
                />
              </AreaChart>
            ) : metric === 'velocity' ? (
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="salesVelocity" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Sales Velocity"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="criticalItems" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Critical Items"
                  dot={false}
                />
                <Legend />
              </LineChart>
            ) : (
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="stockHealth" 
                  fill="#8B5CF6"
                  name="Stock Health Score"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}