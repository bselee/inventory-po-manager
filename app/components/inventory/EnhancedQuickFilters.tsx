import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Archive, 
  BarChart3,
  Settings,
  Star,
  Plus,
  Filter,
  Bookmark,
  Save,
  X,
  Factory,
  ShoppingCart
} from 'lucide-react'

export interface FilterConfig {
  status: 'all' | 'out-of-stock' | 'low-stock' | 'critical' | 'adequate' | 'overstocked' | 'in-stock'
  vendor: string
  location: string
  priceRange: { min: number; max: number }
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  reorderNeeded: boolean
  hasValue: boolean
  costRange: { min: number; max: number }
  stockRange: { min: number; max: number }
  sourceType: 'all' | 'purchased' | 'manufactured'
}

export interface QuickFilter {
  id: string
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  config: FilterConfig
  description: string
  count?: number
  isCustom?: boolean
}

export interface SavedFilter {
  id: string
  name: string
  config: FilterConfig
  isDefault?: boolean
  createdAt: Date
}

interface EnhancedQuickFiltersProps {
  activeFilter: string | null
  onFilterChange: (config: FilterConfig, filterId?: string) => void
  onClearFilters: () => void
  itemCounts?: { [key: string]: number }
  className?: string
}

export default function EnhancedQuickFilters({
  activeFilter,
  onFilterChange,
  onClearFilters,
  itemCounts = {},
  className = ''
}: EnhancedQuickFiltersProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [customFilterName, setCustomFilterName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<FilterConfig>({
    status: 'all',
    vendor: '',
    location: '',
    priceRange: { min: 0, max: 999999 },
    salesVelocity: 'all',
    stockDays: 'all',
    reorderNeeded: false,
    hasValue: false,
    costRange: { min: 0, max: 999999 },
    stockRange: { min: 0, max: 999999 },
    sourceType: 'all'
  })

  // Default quick filters based on the image
  const defaultQuickFilters: QuickFilter[] = [
    {
      id: 'out-of-stock',
      label: 'Out of Stock',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-200',
      description: 'Items with zero current stock',
      config: { 
        status: 'out-of-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 0 },
        sourceType: 'all'
      }
    },
    {
      id: 'reorder-needed',
      label: 'Reorder Needed',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-200',
      description: 'Items below reorder point or recommended for reorder',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: true, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'dead-stock',
      label: 'Dead Stock',
      icon: Archive,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      borderColor: 'border-gray-200',
      description: 'Items with no sales for 180+ days and current stock',
      config: { 
        status: 'in-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'dead', 
        stockDays: 'over-180', 
        reorderNeeded: false, 
        hasValue: true,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'overstocked',
      label: 'Overstocked',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      description: 'Items with excess stock (90+ days supply)',
      config: { 
        status: 'overstocked', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'over-90', 
        reorderNeeded: false, 
        hasValue: true,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'fast-moving',
      label: 'Fast Moving',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      description: 'High velocity items with good sales performance',
      config: { 
        status: 'in-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'fast', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'low-value',
      label: 'Low Value',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
      description: 'Items with unit price under $50',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 50 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 50 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'critical-stock',
      label: 'Critical Stock',
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-100 hover:bg-red-200',
      borderColor: 'border-red-300',
      description: 'Low stock items with less than 30 days supply',
      config: { 
        status: 'low-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'under-30', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'purchased-items',
      label: 'Purchased',
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
      borderColor: 'border-indigo-200',
      description: 'Items purchased from external vendors',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'purchased'
      }
    },
    {
      id: 'manufactured-items',
      label: 'Manufactured',
      icon: Factory,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100',
      borderColor: 'border-emerald-200',
      description: 'Items manufactured by BuildASoil operations',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'manufactured'
      }
    },
    {
      id: 'high-value',
      label: 'High Value',
      icon: Star,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100',
      borderColor: 'border-amber-200',
      description: 'Items with unit price over $100',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 100, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: true,
        costRange: { min: 100, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'medium-stock',
      label: 'Medium Stock',
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100',
      borderColor: 'border-teal-200',
      description: 'Items with 30-90 days supply',
      config: { 
        status: 'adequate', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: '30-60', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'slow-moving',
      label: 'Slow Moving',
      icon: TrendingDown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      borderColor: 'border-yellow-200',
      description: 'Items with low sales velocity but still moving',
      config: { 
        status: 'in-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'slow', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: true,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 1, max: 999999 },
        sourceType: 'all'
      }
    },
    {
      id: 'recently-purchased',
      label: 'Recently Purchased',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      description: 'Items purchased in the last 30 days',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'purchased'
      }
    },
    {
      id: 'needs-attention',
      label: 'Needs Attention',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-200',
      description: 'Items that need immediate attention (out of stock or reorder needed)',
      config: { 
        status: 'out-of-stock', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: true, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 0 },
        sourceType: 'all'
      }
    },
    {
      id: 'new-items',
      label: 'New Items',
      icon: Plus,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      description: 'Items added in the last 30 days',
      config: { 
        status: 'all', 
        vendor: '', 
        location: '', 
        priceRange: { min: 0, max: 999999 }, 
        salesVelocity: 'all', 
        stockDays: 'all', 
        reorderNeeded: false, 
        hasValue: false,
        costRange: { min: 0, max: 999999 },
        stockRange: { min: 0, max: 999999 },
        sourceType: 'all'
      }
    }
  ]

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('inventory-saved-filters')
    if (saved) {
      try {
        const parsedFilters = JSON.parse(saved).map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt)
        }))
        setSavedFilters(parsedFilters)
      } catch (error) {
        logError('Error loading saved filters:', error)
      }
    }
  }, [])

  // Save filters to localStorage
  const saveFilters = (filters: SavedFilter[]) => {
    localStorage.setItem('inventory-saved-filters', JSON.stringify(filters))
    setSavedFilters(filters)
  }

  const handleFilterClick = (filter: QuickFilter) => {
    setCurrentConfig(filter.config)
    onFilterChange(filter.config, filter.id)
  }

  const saveCustomFilter = () => {
    if (!customFilterName.trim()) return

    const newFilter: SavedFilter = {
      id: `custom-${Date.now()}`,
      name: customFilterName.trim(),
      config: currentConfig,
      createdAt: new Date()
    }

    const updatedFilters = [...savedFilters, newFilter]
    saveFilters(updatedFilters)
    setCustomFilterName('')
    setShowSaveDialog(false)
  }

  const deleteSavedFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId)
    saveFilters(updatedFilters)
  }

  const applySavedFilter = (filter: SavedFilter) => {
    setCurrentConfig(filter.config)
    onFilterChange(filter.config, filter.id)
  }

  const getFilterCount = (filterId: string): number => {
    return itemCounts[filterId] || 0
  }

  const hasActiveFilters = () => {
    return activeFilter !== null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Filters</h3>
          <p className="text-sm text-gray-600">Filter inventory by common criteria</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-600"
          >
            <Settings className="h-4 w-4 mr-1" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Default Quick Filters - Compact single row layout */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
        {defaultQuickFilters.map((filter) => {
          const IconComponent = filter.icon
          const isActive = activeFilter === filter.id
          const count = getFilterCount(filter.id)
          
          return (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter)}
              className={`relative group flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${
                isActive 
                  ? `${filter.bgColor} ${filter.color} ${filter.borderColor} shadow-md scale-105` 
                  : `bg-white text-gray-600 border-gray-200 hover:${filter.bgColor} hover:${filter.color} hover:border-gray-300 hover:shadow-sm`
              }`}
              title={filter.description}
            >
              <IconComponent className="h-4 w-4 mb-1" />
              <span className="text-xs font-medium text-center leading-tight">
                {filter.label}
              </span>
              {count > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className="absolute -top-1 -right-1 h-4 min-w-4 text-xs"
                >
                  {count > 99 ? '99+' : count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Saved Custom Filters */}
      {savedFilters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">Saved Filters</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((filter) => (
              <div key={filter.id} className="relative group">
                <button
                  onClick={() => applySavedFilter(filter)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Star className="h-3 w-3" />
                  {filter.name}
                </button>
                <button
                  onClick={() => deleteSavedFilter(filter.id)}
                  className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  title={`Delete ${filter.name} filter`}
                  aria-label={`Delete ${filter.name} filter`}
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Current Filter */}
      {hasActiveFilters() && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Current Filter
          </Button>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Save Filter</CardTitle>
            <CardDescription className="text-xs">
              Save the current filter configuration for quick access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="Enter filter name..."
              value={customFilterName}
              onChange={(e) => setCustomFilterName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  saveCustomFilter()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveCustomFilter}
                disabled={!customFilterName.trim()}
              >
                Save Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </CardTitle>
            <CardDescription className="text-xs">
              Combine multiple criteria for precise filtering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Custom filter controls would go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Stock Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Stock Status
                </label>
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={currentConfig.status}
                  onChange={(e) => setCurrentConfig({
                    ...currentConfig,
                    status: e.target.value as FilterConfig['status']
                  })}
                  title="Select stock status filter"
                  aria-label="Stock status filter"
                >
                  <option value="all">All</option>
                  <option value="in-stock">In Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="overstocked">Overstocked</option>
                </select>
              </div>

              {/* Sales Velocity */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sales Velocity
                </label>
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={currentConfig.salesVelocity}
                  onChange={(e) => setCurrentConfig({
                    ...currentConfig,
                    salesVelocity: e.target.value as FilterConfig['salesVelocity']
                  })}
                  title="Select sales velocity filter"
                  aria-label="Sales velocity filter"
                >
                  <option value="all">All</option>
                  <option value="fast">Fast Moving</option>
                  <option value="medium">Medium</option>
                  <option value="slow">Slow Moving</option>
                  <option value="dead">Dead Stock</option>
                </select>
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Source Type
                </label>
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={currentConfig.sourceType}
                  onChange={(e) => setCurrentConfig({
                    ...currentConfig,
                    sourceType: e.target.value as FilterConfig['sourceType']
                  })}
                  title="Select item source type"
                  aria-label="Source type filter"
                >
                  <option value="all">All Items</option>
                  <option value="purchased">Purchased</option>
                  <option value="manufactured">Manufactured</option>
                </select>
              </div>

              {/* Stock Days */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Days of Stock
                </label>
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={currentConfig.stockDays}
                  onChange={(e) => setCurrentConfig({
                    ...currentConfig,
                    stockDays: e.target.value as FilterConfig['stockDays']
                  })}
                  title="Select stock days filter"
                  aria-label="Stock days filter"
                >
                  <option value="all">All</option>
                  <option value="under-30">Under 30 days</option>
                  <option value="30-60">30-60 days</option>
                  <option value="60-90">60-90 days</option>
                  <option value="over-90">Over 90 days</option>
                  <option value="over-180">Over 180 days</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => onFilterChange(currentConfig, 'custom')}
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
