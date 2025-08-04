import React from 'react'
import { Search, RefreshCw, Grid3X3, List, Table, X } from 'lucide-react'

export interface SyncStatus {
  lastSync: string | null
  isRecent: boolean
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  showViewToggle?: boolean
  viewMode?: 'card' | 'list' | 'table'
  onViewModeChange?: (mode: 'card' | 'list' | 'table') => void
  viewModeOptions?: Array<'card' | 'list' | 'table'>
  customActions?: React.ReactNode
  syncStatus?: SyncStatus
  className?: string
}

const isRecentSync = (lastSyncDate: string) => {
  const now = new Date()
  const syncDate = new Date(lastSyncDate)
  const hoursDiff = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)
  return hoursDiff <= 24
}

const formatSyncTime = (lastSyncDate: string) => {
  const now = new Date()
  const syncDate = new Date(lastSyncDate)
  const hoursDiff = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)
  
  if (hoursDiff < 1) {
    const minutes = Math.floor(hoursDiff * 60)
    return `${minutes}m ago`
  } else if (hoursDiff < 24) {
    return `${Math.floor(hoursDiff)}h ago`
  } else {
    const days = Math.floor(hoursDiff / 24)
    return `${days}d ago`
  }
}

export default function PageHeader({
  title,
  subtitle,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  showRefresh = true,
  refreshing = false,
  onRefresh,
  showViewToggle = false,
  viewMode = 'card',
  onViewModeChange,
  viewModeOptions = ['card', 'list'],
  customActions,
  syncStatus,
  className = ''
}: PageHeaderProps) {
  const getViewIcon = (mode: 'card' | 'list' | 'table') => {
    switch (mode) {
      case 'card':
        return Grid3X3
      case 'list':
        return List
      case 'table':
        return Table
      default:
        return Grid3X3
    }
  }

  const getViewLabel = (mode: 'card' | 'list' | 'table') => {
    switch (mode) {
      case 'card':
        return 'Card View'
      case 'list':
        return 'List View'
      case 'table':
        return 'Table View'
      default:
        return 'Card View'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Title and Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Sync Status */}
          {syncStatus && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className={`h-2 w-2 rounded-full ${
                syncStatus.lastSync && isRecentSync(syncStatus.lastSync)
                  ? 'bg-green-500' 
                  : 'bg-yellow-500'
              }`} />
              <span>
                Last sync: {syncStatus.lastSync 
                  ? formatSyncTime(syncStatus.lastSync)
                  : 'Unknown'
                }
              </span>
            </div>
          )}

          {/* Custom Actions */}
          {customActions}

          {/* Refresh Button */}
          {showRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Search and View Controls Row */}
      {(showSearch || showViewToggle) && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            {showSearch && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchValue && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* View Mode Toggle */}
            {showViewToggle && viewModeOptions.length > 1 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                {viewModeOptions.map((mode) => {
                  const Icon = getViewIcon(mode)
                  const isActive = viewMode === mode
                  
                  return (
                    <button
                      key={mode}
                      onClick={() => onViewModeChange?.(mode)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      title={getViewLabel(mode)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{mode}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
