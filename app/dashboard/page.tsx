'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/components/dashboard/DashboardLayout'
import MetricCards from '@/app/components/dashboard/MetricCards'
import CriticalItemsPanel from '@/app/components/dashboard/CriticalItemsPanel'
import TrendCharts from '@/app/components/dashboard/TrendCharts'
import POActivityTimeline from '@/app/components/dashboard/POActivityTimeline'
import VendorPerformance from '@/app/components/dashboard/VendorPerformance'
import LiveUpdatesPanel from '@/app/components/dashboard/LiveUpdatesPanel'
import { RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
      setLastRefresh(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1)
    setLastRefresh(new Date())
  }

  return (
    <DashboardLayout
      title="Executive Dashboard"
      subtitle="Real-time inventory and business intelligence"
    >
      {/* Controls Bar */}
      <div className="col-span-12 mb-4">
        <div className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-refresh (30s)
            </label>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Metric Cards - Full Width */}
      <MetricCards key={`metrics-${refreshKey}`} />

      {/* Critical Items & Trends - Half Width Each */}
      <CriticalItemsPanel key={`critical-${refreshKey}`} />
      <TrendCharts key={`trends-${refreshKey}`} />

      {/* PO Activity & Live Updates - Half Width Each */}
      <POActivityTimeline key={`po-${refreshKey}`} />
      <LiveUpdatesPanel key={`updates-${refreshKey}`} />

      {/* Vendor Performance - Full Width */}
      <VendorPerformance key={`vendors-${refreshKey}`} />
    </DashboardLayout>
  )
}