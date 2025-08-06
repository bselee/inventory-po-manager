'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  Zap, 
  Database, 
  Globe, 
  Memory, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface PerformanceData {
  api: {
    avgResponseTime: number
    p95ResponseTime: number
    successRate: number
    errorRate: number
  }
  database: {
    avgQueryTime: number
    queryCount: number
    activeConnections: number
  }
  cache: {
    hitRate: number
    missRate: number
    totalRequests: number
  }
  webVitals: {
    lcp: number
    fid: number
    cls: number
    ttfb: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
}

export default function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('/api/performance/metrics')
        const data = await response.json()
        setPerformanceData(data)
      } catch (error) {
        console.error('Failed to fetch performance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()

    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="text-center py-8 text-gray-500">
        No performance data available
      </div>
    )
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (value <= thresholds.warning) return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <span className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* API Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">API Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Avg Response Time</p>
            <p className={`text-2xl font-bold ${getStatusColor(performanceData.api.avgResponseTime, { good: 100, warning: 300 })}`}>
              {performanceData.api.avgResponseTime.toFixed(0)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">P95 Response Time</p>
            <p className={`text-2xl font-bold ${getStatusColor(performanceData.api.p95ResponseTime, { good: 200, warning: 500 })}`}>
              {performanceData.api.p95ResponseTime.toFixed(0)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className={`text-2xl font-bold ${performanceData.api.successRate >= 99 ? 'text-green-600' : 'text-yellow-600'}`}>
              {performanceData.api.successRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Error Rate</p>
            <p className={`text-2xl font-bold ${performanceData.api.errorRate <= 1 ? 'text-green-600' : 'text-red-600'}`}>
              {performanceData.api.errorRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Database Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">Database Performance</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Avg Query Time</p>
            <p className={`text-2xl font-bold ${getStatusColor(performanceData.database.avgQueryTime, { good: 50, warning: 150 })}`}>
              {performanceData.database.avgQueryTime.toFixed(0)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Query Count</p>
            <p className="text-2xl font-bold text-gray-900">
              {performanceData.database.queryCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Connections</p>
            <p className={`text-2xl font-bold ${performanceData.database.activeConnections <= 10 ? 'text-green-600' : 'text-yellow-600'}`}>
              {performanceData.database.activeConnections}
            </p>
          </div>
        </div>
      </div>

      {/* Cache Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">Cache Performance</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Hit Rate</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${performanceData.cache.hitRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {performanceData.cache.hitRate.toFixed(1)}%
              </p>
              {performanceData.cache.hitRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Miss Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {performanceData.cache.missRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">
              {performanceData.cache.totalRequests.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Web Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">Web Vitals</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">LCP</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getStatusColor(performanceData.webVitals.lcp, { good: 2500, warning: 4000 })}`}>
                {(performanceData.webVitals.lcp / 1000).toFixed(1)}s
              </p>
              {getStatusIcon(performanceData.webVitals.lcp, { good: 2500, warning: 4000 })}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">FID</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getStatusColor(performanceData.webVitals.fid, { good: 100, warning: 300 })}`}>
                {performanceData.webVitals.fid.toFixed(0)}ms
              </p>
              {getStatusIcon(performanceData.webVitals.fid, { good: 100, warning: 300 })}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">CLS</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getStatusColor(performanceData.webVitals.cls, { good: 0.1, warning: 0.25 })}`}>
                {performanceData.webVitals.cls.toFixed(3)}
              </p>
              {getStatusIcon(performanceData.webVitals.cls, { good: 0.1, warning: 0.25 })}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">TTFB</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getStatusColor(performanceData.webVitals.ttfb, { good: 800, warning: 1800 })}`}>
                {performanceData.webVitals.ttfb.toFixed(0)}ms
              </p>
              {getStatusIcon(performanceData.webVitals.ttfb, { good: 800, warning: 1800 })}
            </div>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Memory className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">Memory Usage</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Memory Used</span>
              <span className="text-sm font-medium">
                {performanceData.memory.used.toFixed(0)} MB / {performanceData.memory.total.toFixed(0)} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  performanceData.memory.percentage <= 60
                    ? 'bg-green-600'
                    : performanceData.memory.percentage <= 80
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${performanceData.memory.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Score Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Overall Performance Score</h3>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl font-bold">
              {calculateOverallScore(performanceData)}
            </p>
            <p className="text-sm mt-2 opacity-90">
              {getScoreLabel(calculateOverallScore(performanceData))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateOverallScore(data: PerformanceData): number {
  let score = 100

  // API performance (30 points)
  if (data.api.avgResponseTime > 100) score -= Math.min(10, (data.api.avgResponseTime - 100) / 20)
  if (data.api.successRate < 99) score -= Math.min(10, (99 - data.api.successRate) * 2)
  if (data.api.errorRate > 1) score -= Math.min(10, data.api.errorRate * 2)

  // Database performance (20 points)
  if (data.database.avgQueryTime > 50) score -= Math.min(10, (data.database.avgQueryTime - 50) / 10)
  if (data.database.activeConnections > 20) score -= Math.min(10, (data.database.activeConnections - 20) / 2)

  // Cache performance (20 points)
  if (data.cache.hitRate < 80) score -= Math.min(20, (80 - data.cache.hitRate) / 2)

  // Web Vitals (20 points)
  if (data.webVitals.lcp > 2500) score -= Math.min(5, (data.webVitals.lcp - 2500) / 500)
  if (data.webVitals.fid > 100) score -= Math.min(5, (data.webVitals.fid - 100) / 20)
  if (data.webVitals.cls > 0.1) score -= Math.min(5, (data.webVitals.cls - 0.1) * 50)
  if (data.webVitals.ttfb > 800) score -= Math.min(5, (data.webVitals.ttfb - 800) / 200)

  // Memory usage (10 points)
  if (data.memory.percentage > 80) score -= Math.min(10, (data.memory.percentage - 80) / 2)

  return Math.max(0, Math.round(score))
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent Performance'
  if (score >= 75) return 'Good Performance'
  if (score >= 60) return 'Needs Improvement'
  return 'Poor Performance'
}