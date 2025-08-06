'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Filter, 
  X, 
  Search, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bookmark,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Save,
  Factory,
  ShoppingCart,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react'
import { InventoryItem } from '@/app/types'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { cn } from '@/app/lib/utils'

// Unified filter configuration interface
export interface UnifiedFilterConfig {
  // Text search
  search: string
  
  // Status filters
  status: 'all' | 'out-of-stock' | 'critical' | 'low' | 'adequate' | 'overstocked'
  
  // Categorical filters
  vendor: string
  location: string
  sourceType: 'all' | 'purchased' | 'manufactured'
  
  // Numeric ranges
  priceRange: { min: number; max: number }
  costRange: { min: number; max: number }
  stockRange: { min: number; max: number }
  
  // Performance filters
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  demandTrend: 'all' | 'increasing' | 'stable' | 'decreasing'
  
  // Boolean flags
  reorderNeeded: boolean
  hasValue: boolean
  showHidden: boolean
}

// Preset filter definition
export interface PresetFilter {
  id: string
  label: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  borderColor: string
  config: Partial<UnifiedFilterConfig>
  description: string
  count?: number
  isCustom?: boolean
  isPinned?: boolean
}

// Saved filter definition
export interface SavedFilter {
  id: string
  name: string
  config: UnifiedFilterConfig
  isDefault?: boolean
  createdAt: Date
  lastUsed?: Date
}

interface UnifiedFilterSystemProps {
  items: InventoryItem[]
  onFilteredItemsChange: (items: InventoryItem[]) => void
  onActiveFilterChange?: (filterId: string | null) => void
  className?: string
}

// Default filter configuration
const defaultFilterConfig: UnifiedFilterConfig = {
  search: '',
  status: 'all',
  vendor: 'all',
  location: 'all',
  sourceType: 'all',
  priceRange: { min: 0, max: Infinity },
  costRange: { min: 0, max: Infinity },
  stockRange: { min: 0, max: Infinity },
  salesVelocity: 'all',
  stockDays: 'all',
  demandTrend: 'all',
  reorderNeeded: false,
  hasValue: false,
  showHidden: false
}

// Predefined preset filters
const defaultPresets: PresetFilter[] = [
  {
    id: 'critical',
    label: 'Critical Items',
    icon: AlertTriangle,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    config: { status: 'critical', reorderNeeded: true },
    description: 'Items needing immediate attention'
  },
  {
    id: 'out-of-stock',
    label: 'Out of Stock',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    config: { status: 'out-of-stock' },
    description: 'Items with zero stock'
  },
  {
    id: 'low-stock',
    label: 'Low Stock',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    config: { status: 'low' },
    description: 'Items below reorder point'
  },
  {
    id: 'fast-movers',
    label: 'Fast Movers',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    config: { salesVelocity: 'fast' },
    description: 'High velocity items'
  },
  {
    id: 'slow-movers',
    label: 'Slow Movers',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    config: { salesVelocity: 'slow' },
    description: 'Low velocity items'
  },
  {
    id: 'overstocked',
    label: 'Overstocked',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    config: { status: 'overstocked', stockDays: 'over-180' },
    description: 'Excess inventory items'
  },
  {
    id: 'high-value',
    label: 'High Value',
    icon: DollarSign,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    config: { hasValue: true, priceRange: { min: 100, max: Infinity } },
    description: 'High cost items'
  },
  {
    id: 'reorder-needed',
    label: 'Reorder Needed',
    icon: ShoppingCart,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    config: { reorderNeeded: true },
    description: 'Items to reorder now'
  }
]

export default function UnifiedFilterSystem({
  items,
  onFilteredItemsChange,
  onActiveFilterChange,
  className = ''
}: UnifiedFilterSystemProps) {
  // Core state
  const [filterConfig, setFilterConfig] = useState<UnifiedFilterConfig>(defaultFilterConfig)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  
  // Extract unique values for dropdowns
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(items.map(item => item.vendor).filter(Boolean))
    return ['all', ...Array.from(vendors).sort()]
  }, [items])
  
  const uniqueLocations = useMemo(() => {
    const locations = new Set(items.map(item => item.location).filter(Boolean))
    return ['all', ...Array.from(locations).sort()]
  }, [items])
  
  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    defaultPresets.forEach(preset => {
      counts[preset.id] = items.filter(item => 
        applyFilterToItem(item, { ...defaultFilterConfig, ...preset.config })
      ).length
    })
    
    return counts
  }, [items])
  
  // Load saved filters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-saved-filters')
      if (saved) {
        try {
          const filters = JSON.parse(saved)
          setSavedFilters(filters.map((f: any) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            lastUsed: f.lastUsed ? new Date(f.lastUsed) : undefined
          })))
        } catch (error) {
          console.error('Failed to load saved filters:', error)
        }
      }
    }
  }, [])
  
  // Save filters to localStorage
  const saveFilters = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory-saved-filters', JSON.stringify(savedFilters))
    }
  }, [savedFilters])
  
  // Apply filter to a single item
  const applyFilterToItem = useCallback((item: InventoryItem, config: UnifiedFilterConfig): boolean => {
    // Text search
    if (config.search) {
      const searchLower = config.search.toLowerCase()
      const matchesSearch = 
        item.sku?.toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower) ||
        item.vendor?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    
    // Status filter
    if (config.status !== 'all') {
      const stock = item.current_stock || 0
      const reorderPoint = item.reorder_point || 0
      
      switch (config.status) {
        case 'out-of-stock':
          if (stock !== 0) return false
          break
        case 'critical':
          if (stock >= reorderPoint || stock === 0) return false
          break
        case 'low':
          if (stock === 0 || stock > reorderPoint * 2) return false
          break
        case 'adequate':
          if (stock <= reorderPoint * 2 || stock > reorderPoint * 5) return false
          break
        case 'overstocked':
          if (stock <= reorderPoint * 5) return false
          break
      }
    }
    
    // Vendor filter
    if (config.vendor !== 'all' && item.vendor !== config.vendor) return false
    
    // Location filter
    if (config.location !== 'all' && item.location !== config.location) return false
    
    // Source type filter
    if (config.sourceType !== 'all') {
      const isManufactured = item.vendor?.toLowerCase().includes('manufactured') || 
                            item.vendor?.toLowerCase().includes('in-house')
      if (config.sourceType === 'manufactured' && !isManufactured) return false
      if (config.sourceType === 'purchased' && isManufactured) return false
    }
    
    // Price range filter
    const price = item.unit_price || 0
    if (price < config.priceRange.min || price > config.priceRange.max) return false
    
    // Cost range filter
    const cost = item.unit_cost || 0
    if (cost < config.costRange.min || cost > config.costRange.max) return false
    
    // Stock range filter
    const stock = item.current_stock || 0
    if (stock < config.stockRange.min || stock > config.stockRange.max) return false
    
    // Sales velocity filter
    if (config.salesVelocity !== 'all') {
      const velocity = item.sales_velocity || 0
      switch (config.salesVelocity) {
        case 'fast':
          if (velocity < 10) return false
          break
        case 'medium':
          if (velocity < 1 || velocity >= 10) return false
          break
        case 'slow':
          if (velocity < 0.1 || velocity >= 1) return false
          break
        case 'dead':
          if (velocity >= 0.1) return false
          break
      }
    }
    
    // Stock days filter
    if (config.stockDays !== 'all') {
      const daysUntilStockout = item.days_until_stockout || Infinity
      switch (config.stockDays) {
        case 'under-30':
          if (daysUntilStockout >= 30) return false
          break
        case '30-60':
          if (daysUntilStockout < 30 || daysUntilStockout >= 60) return false
          break
        case '60-90':
          if (daysUntilStockout < 60 || daysUntilStockout >= 90) return false
          break
        case 'over-90':
          if (daysUntilStockout < 90 || daysUntilStockout >= 180) return false
          break
        case 'over-180':
          if (daysUntilStockout < 180) return false
          break
      }
    }
    
    // Demand trend filter
    if (config.demandTrend !== 'all') {
      const trend = item.demand_trend || 'stable'
      if (trend !== config.demandTrend) return false
    }
    
    // Boolean filters
    if (config.reorderNeeded && !item.reorder_recommendation) return false
    if (config.hasValue) {
      const value = (item.current_stock || 0) * (item.unit_cost || 0)
      if (value < 100) return false
    }
    if (!config.showHidden && item.hidden) return false
    
    return true
  }, [])
  
  // Apply filters to all items
  useEffect(() => {
    const filtered = items.filter(item => applyFilterToItem(item, filterConfig))
    onFilteredItemsChange(filtered)
  }, [items, filterConfig, applyFilterToItem, onFilteredItemsChange])
  
  // Update filter configuration
  const updateFilter = useCallback((updates: Partial<UnifiedFilterConfig>) => {
    setFilterConfig(prev => ({ ...prev, ...updates }))
    setActivePresetId(null) // Clear preset when manually changing filters
  }, [])
  
  // Apply preset filter
  const applyPreset = useCallback((preset: PresetFilter) => {
    setFilterConfig({ ...defaultFilterConfig, ...preset.config })
    setActivePresetId(preset.id)
    onActiveFilterChange?.(preset.id)
  }, [onActiveFilterChange])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterConfig(defaultFilterConfig)
    setActivePresetId(null)
    onActiveFilterChange?.(null)
  }, [onActiveFilterChange])
  
  // Save current filter
  const saveCurrentFilter = useCallback(() => {
    if (!filterName.trim()) return
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      config: { ...filterConfig },
      createdAt: new Date(),
      lastUsed: new Date()
    }
    
    setSavedFilters(prev => {
      const updated = [...prev, newFilter]
      localStorage.setItem('inventory-saved-filters', JSON.stringify(updated))
      return updated
    })
    
    setFilterName('')
    setShowSaveDialog(false)
  }, [filterConfig, filterName])
  
  // Delete saved filter
  const deleteSavedFilter = useCallback((id: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(f => f.id !== id)
      localStorage.setItem('inventory-saved-filters', JSON.stringify(updated))
      return updated
    })
  }, [])
  
  // Apply saved filter
  const applySavedFilter = useCallback((filter: SavedFilter) => {
    setFilterConfig(filter.config)
    setActivePresetId(null)
    
    // Update last used
    setSavedFilters(prev => {
      const updated = prev.map(f => 
        f.id === filter.id ? { ...f, lastUsed: new Date() } : f
      )
      localStorage.setItem('inventory-saved-filters', JSON.stringify(updated))
      return updated
    })
  }, [])
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterConfig.search) count++
    if (filterConfig.status !== 'all') count++
    if (filterConfig.vendor !== 'all') count++
    if (filterConfig.location !== 'all') count++
    if (filterConfig.sourceType !== 'all') count++
    if (filterConfig.salesVelocity !== 'all') count++
    if (filterConfig.stockDays !== 'all') count++
    if (filterConfig.demandTrend !== 'all') count++
    if (filterConfig.reorderNeeded) count++
    if (filterConfig.hasValue) count++
    if (filterConfig.showHidden) count++
    if (filterConfig.priceRange.min > 0 || filterConfig.priceRange.max < Infinity) count++
    if (filterConfig.costRange.min > 0 || filterConfig.costRange.max < Infinity) count++
    if (filterConfig.stockRange.min > 0 || filterConfig.stockRange.max < Infinity) count++
    return count
  }, [filterConfig])
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Filter Presets */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 px-2"
            >
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="ml-1">Advanced</span>
            </Button>
          </div>
        </div>
        
        {/* Preset filter buttons */}
        <div className="flex flex-wrap gap-2">
          {defaultPresets.map(preset => {
            const Icon = preset.icon
            const isActive = activePresetId === preset.id
            const count = filterCounts[preset.id] || 0
            
            return (
              <button
                key={preset.id}
                onClick={() => isActive ? clearFilters() : applyPreset(preset)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  'border hover:shadow-sm',
                  isActive ? [
                    preset.bgColor,
                    preset.borderColor,
                    preset.color,
                    'ring-2 ring-offset-1',
                    preset.borderColor.replace('border', 'ring')
                  ] : [
                    'bg-white border-gray-200 text-gray-700',
                    'hover:bg-gray-50'
                  ]
                )}
                title={preset.description}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{preset.label}</span>
                {count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'ml-1 h-5 px-1.5 text-xs',
                      isActive && 'bg-white/80'
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Saved filters */}
        {savedFilters.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Saved Filters</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(filter => (
                <div key={filter.id} className="flex items-center gap-1">
                  <button
                    onClick={() => applySavedFilter(filter)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Star className="h-3 w-3" />
                    {filter.name}
                  </button>
                  <button
                    onClick={() => deleteSavedFilter(filter.id)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="h-7"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Filter
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="SKU or name..."
                  value={filterConfig.search}
                  onChange={(e) => updateFilter({ search: e.target.value })}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            
            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Stock Status</Label>
              <Select
                value={filterConfig.status}
                onValueChange={(value) => updateFilter({ status: value as any })}
              >
                <SelectTrigger id="status" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="adequate">Adequate</SelectItem>
                  <SelectItem value="overstocked">Overstocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Vendor */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor" className="text-xs">Vendor</Label>
              <Select
                value={filterConfig.vendor}
                onValueChange={(value) => updateFilter({ vendor: value })}
              >
                <SelectTrigger id="vendor" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uniqueVendors.map(vendor => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor === 'all' ? 'All Vendors' : vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs">Location</Label>
              <Select
                value={filterConfig.location}
                onValueChange={(value) => updateFilter({ location: value })}
              >
                <SelectTrigger id="location" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location === 'all' ? 'All Locations' : location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sales Velocity */}
            <div className="space-y-1.5">
              <Label htmlFor="velocity" className="text-xs">Sales Velocity</Label>
              <Select
                value={filterConfig.salesVelocity}
                onValueChange={(value) => updateFilter({ salesVelocity: value as any })}
              >
                <SelectTrigger id="velocity" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Velocities</SelectItem>
                  <SelectItem value="fast">Fast Moving</SelectItem>
                  <SelectItem value="medium">Medium Moving</SelectItem>
                  <SelectItem value="slow">Slow Moving</SelectItem>
                  <SelectItem value="dead">Dead Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Stock Days */}
            <div className="space-y-1.5">
              <Label htmlFor="stockdays" className="text-xs">Days of Stock</Label>
              <Select
                value={filterConfig.stockDays}
                onValueChange={(value) => updateFilter({ stockDays: value as any })}
              >
                <SelectTrigger id="stockdays" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranges</SelectItem>
                  <SelectItem value="under-30">Under 30 days</SelectItem>
                  <SelectItem value="30-60">30-60 days</SelectItem>
                  <SelectItem value="60-90">60-90 days</SelectItem>
                  <SelectItem value="over-90">Over 90 days</SelectItem>
                  <SelectItem value="over-180">Over 180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Demand Trend */}
            <div className="space-y-1.5">
              <Label htmlFor="trend" className="text-xs">Demand Trend</Label>
              <Select
                value={filterConfig.demandTrend}
                onValueChange={(value) => updateFilter({ demandTrend: value as any })}
              >
                <SelectTrigger id="trend" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trends</SelectItem>
                  <SelectItem value="increasing">Increasing</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="decreasing">Decreasing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Source Type */}
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-xs">Source Type</Label>
              <Select
                value={filterConfig.sourceType}
                onValueChange={(value) => updateFilter({ sourceType: value as any })}
              >
                <SelectTrigger id="source" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchased">Purchased</SelectItem>
                  <SelectItem value="manufactured">Manufactured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Boolean Filters */}
          <div className="flex flex-wrap gap-4 pt-2 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterConfig.reorderNeeded}
                onChange={(e) => updateFilter({ reorderNeeded: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Reorder Needed</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterConfig.hasValue}
                onChange={(e) => updateFilter({ hasValue: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">High Value Items</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterConfig.showHidden}
                onChange={(e) => updateFilter({ showHidden: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show Hidden</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="filter-name">Filter Name</Label>
                <Input
                  id="filter-name"
                  type="text"
                  placeholder="Enter filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveDialog(false)
                    setFilterName('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveCurrentFilter}
                  disabled={!filterName.trim()}
                >
                  Save Filter
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}