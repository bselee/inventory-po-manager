import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { 
  Activity, 
  Zap, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Settings,
  TrendingUp,
  Clock,
  Database
} from 'lucide-react'

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
}

interface SyncHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: {
    changeDetection: boolean
    realTimeMonitoring: boolean
    intelligentScheduling: boolean
    database: boolean
  }
  lastSync: Date | null
  criticalAlerts: number
}

export default function EnhancedSyncManager() {
  const [syncResult, setSyncResult] = useState<EnhancedSyncResult | null>(null)
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<'smart' | 'full' | 'inventory' | 'critical' | 'active'>('smart')

  // Fetch sync health on component mount
  useEffect(() => {
    fetchSyncHealth()
  }, [])

  const fetchSyncHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/sync/enhanced?action=health')
      const result = await response.json()
      
      if (result.success) {
        setSyncHealth(result.data)
      } else {
        setError('Failed to fetch sync health')
      }
    } catch (err) {
      console.error('Health check failed:', err)
      setError('Health check failed')
    }
  }, [])

  const executeEnhancedSync = async (action: 'sync' | 'intelligent') => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          strategy: selectedStrategy,
          enableChangeDetection: true,
          enableRealTimeMonitoring: true,
          enableIntelligentScheduling: action === 'intelligent'
        })
      })

      const result = await response.json()

      if (result.success) {
        setSyncResult(result.data.enhancedResult || result.data)
        await fetchSyncHealth() // Refresh health after sync
      } else {
        setError(result.message || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync failed:', err)
      setError('Sync request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const initializeEnhancedSync = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sync/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'initialize' })
      })

      const result = await response.json()

      if (result.success) {
        await fetchSyncHealth()
      } else {
        setError(result.message || 'Initialization failed')
      }
    } catch (err) {
      console.error('Initialization failed:', err)
      setError('Initialization request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'unhealthy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enhanced Sync Manager</h2>
          <p className="text-muted-foreground">
            Advanced inventory synchronization with change detection and real-time monitoring
          </p>
        </div>
        <Button 
          onClick={fetchSyncHealth}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health
          </CardTitle>
          <CardDescription>
            Real-time status of enhanced sync components
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncHealth ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getHealthIcon(syncHealth.status)}
                  <span className="ml-2 font-medium capitalize">{syncHealth.status}</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`${getHealthStatusColor(syncHealth.status)} text-white`}
                >
                  {syncHealth.status.toUpperCase()}
                </Badge>
              </div>

              {/* Component Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Change Detection</span>
                    {syncHealth.components.changeDetection ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Real-time Monitoring</span>
                    {syncHealth.components.realTimeMonitoring ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Intelligent Scheduling</span>
                    {syncHealth.components.intelligentScheduling ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    {syncHealth.components.database ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Last Sync:</span>
                  <span className="text-muted-foreground">
                    {syncHealth.lastSync 
                      ? new Date(syncHealth.lastSync).toLocaleString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Critical Alerts:</span>
                  <Badge variant={syncHealth.criticalAlerts > 0 ? "destructive" : "secondary"}>
                    {syncHealth.criticalAlerts}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Loading health status...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Manual Sync
            </CardTitle>
            <CardDescription>
              Execute enhanced sync with selected strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strategy Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Strategy</label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as any)}
                className="w-full p-2 border rounded-md bg-background"
                disabled={isLoading}
                title="Select sync strategy"
                aria-label="Select sync strategy"
              >
                <option value="smart">Smart (Recommended)</option>
                <option value="full">Full Sync</option>
                <option value="inventory">Inventory Only</option>
                <option value="critical">Critical Items</option>
                <option value="active">Active Items</option>
              </select>
            </div>

            <Button
              onClick={() => executeEnhancedSync('sync')}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Execute Enhanced Sync
            </Button>
          </CardContent>
        </Card>

        {/* Intelligent Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              Intelligent Sync
            </CardTitle>
            <CardDescription>
              AI-powered sync with automatic strategy selection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatically analyzes patterns and selects the optimal sync strategy based on current conditions.
            </p>

            <Button
              onClick={() => executeEnhancedSync('intelligent')}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Execute Intelligent Sync
            </Button>

            <Button
              onClick={initializeEnhancedSync}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Initialize System
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync Results */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Last Sync Results
            </CardTitle>
            <CardDescription>
              Performance metrics from the most recent enhanced sync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syncResult.itemsProcessed}</div>
                <div className="text-sm text-muted-foreground">Items Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncResult.itemsUpdated}</div>
                <div className="text-sm text-muted-foreground">Items Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{syncResult.itemsSkipped}</div>
                <div className="text-sm text-muted-foreground">Items Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{syncResult.newItems}</div>
                <div className="text-sm text-muted-foreground">New Items</div>
              </div>
            </div>

            {/* Change Detection Stats */}
            {syncResult.changeDetectionStats.enabled && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Change Detection Performance
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Change Rate</span>
                      <span>{syncResult.changeDetectionStats.changeRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={syncResult.changeDetectionStats.changeRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Efficiency Gain</span>
                      <span>{syncResult.changeDetectionStats.efficiencyGain.toFixed(1)}%</span>
                    </div>
                    <Progress value={syncResult.changeDetectionStats.efficiencyGain} className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Duration and Strategy */}
            <div className="flex items-center justify-between pt-4 border-t text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Duration: {Math.round(syncResult.duration / 1000)}s
              </div>
              <Badge variant="outline">
                {syncResult.strategy.toUpperCase()} Strategy
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
