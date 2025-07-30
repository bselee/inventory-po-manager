'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Settings,
  TrendingUp,
  Clock,
  Database,
  Zap,
  Brain,
  Bell,
  BarChart3,
  Calendar,
  Shield,
  Pause,
  Play
} from 'lucide-react'

interface SyncHealth {
  status: 'healthy' | 'warning' | 'critical'
  lastSync: Date | null
  nextSync: Date | null
  criticalItems: number
  changeRate: number
  syncFrequency: string
}

interface EnhancedSyncResult {
  success: boolean
  strategy: string
  itemsProcessed: number
  itemsUpdated: number
  itemsSkipped: number
  newItems: number
  duration: number
  changeDetectionStats: {
    enabled: boolean
    changeRate: number
    efficiencyGain: number
  }
  realTimeAlerts: number
  errors?: string[]
}

interface ScheduleStatus {
  isRunning: boolean
  activeStrategies: string[]
  nextScheduledSync: Date | null
}

export default function EnhancedSyncDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<EnhancedSyncResult | null>(null)
  const [syncHealth, setSyncHealth] = useState<SyncHealth>({
    status: 'healthy',
    lastSync: null,
    nextSync: null,
    criticalItems: 0,
    changeRate: 0,
    syncFrequency: 'Every 6 hours'
  })
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>({
    isRunning: false,
    activeStrategies: [],
    nextScheduledSync: null
  })
  const [selectedStrategy, setSelectedStrategy] = useState('smart')
  const [enableChangeDetection, setEnableChangeDetection] = useState(true)
  const [enableRealTimeMonitoring, setEnableRealTimeMonitoring] = useState(true)
  const [enableIntelligentScheduling, setEnableIntelligentScheduling] = useState(false)

  useEffect(() => {
    checkSyncHealth()
    const interval = setInterval(checkSyncHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkSyncHealth = async () => {
    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSyncHealth(data.health)
        setScheduleStatus(data.scheduleStatus || {
          isRunning: false,
          activeStrategies: [],
          nextScheduledSync: null
        })
      }
    } catch (error) {
      console.error('Failed to check sync health:', error)
    }
  }

  const executeSyncWithStrategy = async () => {
    setIsLoading(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync',
          strategy: selectedStrategy,
          enableChangeDetection,
          enableRealTimeMonitoring,
          enableIntelligentScheduling,
          forceSync: false,
          dryRun: false
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSyncResult(data.data)
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncResult({
        success: false,
        strategy: selectedStrategy,
        itemsProcessed: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        newItems: 0,
        duration: 0,
        changeDetectionStats: {
          enabled: false,
          changeRate: 0,
          efficiencyGain: 0
        },
        realTimeAlerts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsLoading(false)
      checkSyncHealth()
    }
  }

  const executeIntelligentSync = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'intelligent-sync'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSyncResult(data.data.result)
      }
    } catch (error) {
      console.error('Intelligent sync error:', error)
    } finally {
      setIsLoading(false)
      checkSyncHealth()
    }
  }

  const toggleScheduling = async () => {
    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: scheduleStatus.isRunning ? 'stop-scheduling' : 'start-scheduling'
        })
      })
      
      if (response.ok) {
        checkSyncHealth()
      }
    } catch (error) {
      console.error('Failed to toggle scheduling:', error)
    }
  }

  const getHealthIcon = () => {
    switch (syncHealth.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getHealthBadgeVariant = () => {
    switch (syncHealth.status) {
      case 'healthy':
        return 'success'
      case 'warning':
        return 'warning'
      case 'critical':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Enhanced Sync Dashboard</CardTitle>
              {getHealthIcon()}
            </div>
            <Badge variant={getHealthBadgeVariant()}>
              {syncHealth.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Real-time sync monitoring with intelligent optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-lg font-semibold">
                {syncHealth.lastSync 
                  ? new Date(syncHealth.lastSync).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Critical Items</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                {syncHealth.criticalItems}
                {syncHealth.criticalItems > 0 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Change Rate</p>
              <p className="text-lg font-semibold">
                {syncHealth.changeRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Controls</CardTitle>
          <CardDescription>
            Execute manual sync or manage automated scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={isLoading}
            >
              <option value="smart">Smart Sync (Changed Items Only)</option>
              <option value="full">Full Sync (All Items)</option>
              <option value="inventory">Inventory Only</option>
              <option value="critical">Critical Items Only</option>
              <option value="active">Active Products Only</option>
            </select>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableChangeDetection}
                onChange={(e) => setEnableChangeDetection(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">Enable Change Detection</span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableRealTimeMonitoring}
                onChange={(e) => setEnableRealTimeMonitoring(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">Enable Real-time Monitoring</span>
              <Activity className="h-4 w-4 text-green-500" />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableIntelligentScheduling}
                onChange={(e) => setEnableIntelligentScheduling(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">Enable Intelligent Scheduling</span>
              <Brain className="h-4 w-4 text-purple-500" />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={executeSyncWithStrategy}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Execute Sync
                </>
              )}
            </Button>
            <Button
              onClick={executeIntelligentSync}
              variant="outline"
              disabled={isLoading}
            >
              <Brain className="mr-2 h-4 w-4" />
              Smart Analysis
            </Button>
          </div>

          {/* Scheduling Controls */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automated Scheduling</p>
                <p className="text-sm text-muted-foreground">
                  {scheduleStatus.isRunning 
                    ? `Active: ${scheduleStatus.activeStrategies.join(', ')}`
                    : 'Inactive'
                  }
                </p>
              </div>
              <Button
                onClick={toggleScheduling}
                variant="outline"
                size="sm"
              >
                {scheduleStatus.isRunning ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card className={syncResult.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sync Results</CardTitle>
              <Badge variant={syncResult.success ? 'success' : 'destructive'}>
                {syncResult.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Strategy</p>
                <p className="font-semibold capitalize">{syncResult.strategy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{(syncResult.duration / 1000).toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Processed</p>
                <p className="font-semibold">{syncResult.itemsProcessed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Updated</p>
                <p className="font-semibold">{syncResult.itemsUpdated}</p>
              </div>
            </div>

            {/* Progress Breakdown */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Updated Items</span>
                  <span>{syncResult.itemsUpdated} / {syncResult.itemsProcessed}</span>
                </div>
                <Progress 
                  value={(syncResult.itemsUpdated / Math.max(syncResult.itemsProcessed, 1)) * 100}
                />
              </div>

              {syncResult.changeDetectionStats.enabled && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Efficiency Gain</span>
                    <span>{syncResult.changeDetectionStats.efficiencyGain.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={syncResult.changeDetectionStats.efficiencyGain}
                    className="bg-green-100"
                  />
                </div>
              )}
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">New Items</p>
                  <p className="font-semibold">{syncResult.newItems}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Real-time Alerts</p>
                  <p className="font-semibold">{syncResult.realTimeAlerts}</p>
                </div>
              </div>
            </div>

            {/* Errors */}
            {syncResult.errors && syncResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                {syncResult.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">{error}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}