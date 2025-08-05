import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface CacheMetrics {
  totalItems: number;
  lastFetch: string;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  cacheExists: boolean;
  cacheAge?: string;
}

interface CacheHealth {
  cache: 'healthy' | 'degraded' | 'down';
  api: 'healthy' | 'degraded' | 'down';
  metrics: CacheMetrics;
}

interface CacheManagerProps {
  onDataRefresh?: () => void;
  showMetrics?: boolean;
  compact?: boolean;
}

export function CacheManager({ onDataRefresh, showMetrics = true, compact = false }: CacheManagerProps) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [health, setHealth] = useState<CacheHealth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Load cache metrics on mount
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/inventory/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'healthCheck' })
      });
      
      if (response.ok) {
        const result = await response.json();
        setHealth(result.health);
        setMetrics(result.health.metrics);
      }
    } catch (error) {
      console.error('Failed to load cache metrics:', error);
    }
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    setLastAction('Refreshing cache...');
    
    try {
      const response = await fetch('/api/inventory/cache?forceRefresh=true');
      
      if (response.ok) {
        const result = await response.json();
        setLastAction(`Cache refreshed - ${result.count} items loaded`);
        await loadMetrics();
        onDataRefresh?.();
      } else {
        setLastAction('Cache refresh failed');
      }
    } catch (error) {
      setLastAction('Cache refresh error');
      console.error('Cache refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    setLastAction('Clearing cache...');
    
    try {
      const response = await fetch('/api/inventory/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearCache' })
      });
      
      if (response.ok) {
        setLastAction('Cache cleared');
        await loadMetrics();
      } else {
        setLastAction('Clear cache failed');
      }
    } catch (error) {
      setLastAction('Clear cache error');
      console.error('Clear cache error:', error);
    }
  };

  const handleWarmUpCache = async () => {
    setIsRefreshing(true);
    setLastAction('Warming up cache...');
    
    try {
      const response = await fetch('/api/inventory/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warmUpCache' })
      });
      
      if (response.ok) {
        const result = await response.json();
        setLastAction(`Cache warmed up - ${result.metrics.totalItems} items`);
        await loadMetrics();
      } else {
        setLastAction('Cache warm up failed');
      }
    } catch (error) {
      setLastAction('Cache warm up error');
      console.error('Cache warm up error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'down':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefreshCache}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
          title="Refresh cache"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        
        {health && (
          <div className="flex items-center gap-1">
            {getStatusIcon(health.cache)}
            <span className="text-xs text-gray-600">
              {metrics?.cacheAge || 'No cache'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Cache Management
        </h3>
        <button
          onClick={loadMetrics}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Refresh metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Health Status */}
      {health && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg border ${getStatusColor(health.cache)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(health.cache)}
              <span className="font-medium">Cache Status</span>
            </div>
            <p className="text-sm capitalize">{health.cache}</p>
          </div>
          <div className={`p-3 rounded-lg border ${getStatusColor(health.api)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(health.api)}
              <span className="font-medium">API Status</span>
            </div>
            <p className="text-sm capitalize">{health.api}</p>
          </div>
        </div>
      )}

      {/* Cache Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleRefreshCache}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Force Refresh
        </button>
        
        <button
          onClick={handleWarmUpCache}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Activity className="w-4 h-4" />
          Warm Up Cache
        </button>
        
        <button
          onClick={handleClearCache}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Database className="w-4 h-4" />
          Clear Cache
        </button>
      </div>

      {/* Metrics Display */}
      {showMetrics && metrics && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Cache Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.cacheHits}</div>
              <div className="text-sm text-gray-600">Cache Hits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.cacheMisses}</div>
              <div className="text-sm text-gray-600">Cache Misses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.apiCalls}</div>
              <div className="text-sm text-gray-600">API Calls</div>
            </div>
          </div>
          
          {metrics.cacheAge && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Cache Age: {metrics.cacheAge}</span>
            </div>
          )}
        </div>
      )}

      {/* Last Action Status */}
      {lastAction && (
        <div className="mt-4 p-2 bg-gray-50 rounded text-sm text-gray-700">
          {lastAction}
        </div>
      )}
    </div>
  );
}

export default CacheManager;
