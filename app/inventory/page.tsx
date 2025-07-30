'use client'

import { useState, useEffect } from 'react'
// Removed direct database access - now using API calls
import { Package, AlertTriangle, TrendingDown, TrendingUp, Search, Filter, RefreshCw, Plus, Edit2, Loader2, Clock, DollarSign, BarChart3, Zap, AlertCircle, Archive } from 'lucide-react'
import useInventoryFiltering from '@/app/hooks/useOptimizedInventoryFilter'
import SafeFilteredInventory from '@/app/components/SafeFilteredInventory'
import InventoryDataStatus from '@/app/components/inventory/InventoryDataStatus'
import QuickStockAdjust from '@/app/components/inventory/QuickStockAdjust'
import ExportInventory from '@/app/components/inventory/ExportInventory'
import CriticalItemsMonitor from '@/app/components/CriticalItemsMonitor'
import { useDebounce } from '@/app/hooks/useDebounce'
import type { InventoryItem as ImportedInventoryItem } from '@/app/types'
import {
  calculateSalesVelocity,
  calculateDaysUntilStockout,
  determineStockStatus,
  calculateTrend,
  enhanceItemsWithCalculations,
  getStockStatusDisplay,
  formatInventoryValue,
  shouldReorder
} from '@/app/lib/inventory-calculations'

interface InventoryItem {
  id: string
  sku: string
  product_name?: string
  name?: string
  current_stock: number
  location?: string
  minimum_stock: number
  maximum_stock?: number
  reorder_point?: number
  reorder_quantity?: number
  vendor?: string
  cost?: number
  unit_price?: number
  sales_last_30_days?: number
  sales_last_90_days?: number
  last_sales_update?: string
  last_updated?: string
  // Calculated fields for planning
  sales_velocity?: number
  days_until_stockout?: number
  reorder_recommended?: boolean
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  trend?: 'increasing' | 'decreasing' | 'stable'
}

interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
  critical_reorder_count?: number
  overstocked_count?: number
}

interface SortConfig {
  key: keyof InventoryItem
  direction: 'asc' | 'desc'
}

interface FilterConfig {
  status: 'all' | 'out-of-stock' | 'low-stock' | 'critical' | 'adequate' | 'overstocked' | 'in-stock'
  vendor: string
  location: string
  priceRange: { min: number; max: number }
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  reorderNeeded: boolean
  hasValue: boolean
}

interface PresetFilter {
  id: string
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  config: FilterConfig
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [allItems, setAllItems] = useState<InventoryItem[]>([]) // Store all items for filtering/searching
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteringInProgress, setFilteringInProgress] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm, 300) // 300ms delay
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_name', direction: 'asc' })
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: 'all',
    vendor: '',
    location: '',
    priceRange: { min: 0, max: 999999 }, // Set to very high value to include all items
    salesVelocity: 'all',
    stockDays: 'all',
    reorderNeeded: false,
    hasValue: false
  })
  const [activePresetFilter, setActivePresetFilter] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'planning' | 'analytics'>('table')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editCost, setEditCost] = useState(0)
  const [showCostEdit, setShowCostEdit] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100) // Default to 100 items per page
  const [totalItems, setTotalItems] = useState(0)
  const [dataQualityMetrics, setDataQualityMetrics] = useState({
    itemsWithSalesData: 0,
    itemsWithCost: 0,
    itemsWithVendor: 0,
    lastSyncDate: null as string | null
  })

  useEffect(() => {
    loadInventory()
    loadSummary()
  }, [])

  // Preset filters configuration
  const presetFilters: PresetFilter[] = [
    {
      id: 'out-of-stock',
      label: 'Out of Stock',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-200',
      config: { status: 'out-of-stock', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'all', stockDays: 'all', reorderNeeded: false, hasValue: false }
    },
    {
      id: 'reorder-needed',
      label: 'Reorder Needed',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-200',
      config: { status: 'all', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'all', stockDays: 'all', reorderNeeded: true, hasValue: false }
    },
    {
      id: 'dead-stock',
      label: 'Dead Stock',
      icon: Archive,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      borderColor: 'border-gray-200',
      config: { status: 'all', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'slow', stockDays: 'over-180', reorderNeeded: false, hasValue: true }
    },
    {
      id: 'overstocked',
      label: 'Overstocked',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      config: { status: 'all', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'all', stockDays: 'over-90', reorderNeeded: false, hasValue: true }
    },
    {
      id: 'fast-moving',
      label: 'Fast Moving',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      config: { status: 'in-stock', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'fast', stockDays: 'all', reorderNeeded: false, hasValue: false }
    },
    {
      id: 'low-value',
      label: 'Low Value',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
      config: { status: 'all', vendor: '', location: '', priceRange: { min: 0, max: 50 }, salesVelocity: 'all', stockDays: 'all', reorderNeeded: false, hasValue: false }
    },
    {
      id: 'critical-stock',
      label: 'Critical Stock',
      icon: Clock,
      color: 'text-red-700',
      bgColor: 'bg-red-100 hover:bg-red-200',
      borderColor: 'border-red-300',
      config: { status: 'low-stock', vendor: '', location: '', priceRange: { min: 0, max: 999999 }, salesVelocity: 'all', stockDays: 'under-30', reorderNeeded: false, hasValue: false }
    }
  ]

  // Apply preset filter
  const applyPresetFilter = (presetId: string) => {
    const preset = presetFilters.find(p => p.id === presetId)
    if (preset) {
      setFilterConfig(preset.config)
      setActivePresetFilter(presetId)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilterConfig({
      status: 'all',
      vendor: '',
      location: '',
      priceRange: { min: 0, max: 999999 },
      salesVelocity: 'all',
      stockDays: 'all',
      reorderNeeded: false,
      hasValue: false
    })
    setActivePresetFilter(null)
    setSearchTerm('')
  }

  // Use optimized filtering hook with debounced search
  const filteredItems = useInventoryFiltering(allItems, debouncedSearchTerm, filterConfig, sortConfig)

  // Update displayed items when filters, search, or pagination changes
  useEffect(() => {
    if (filteredItems.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setItems(filteredItems.slice(startIndex, endIndex))
      setTotalItems(filteredItems.length)
    } else {
      setItems([])
      setTotalItems(0)
    }
  }, [filteredItems, currentPage, itemsPerPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterConfig])

  // Pagination handlers
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Removed duplicate calculation functions - now imported from inventory-calculations.ts

  const loadInventory = async () => {
    try {
      // Use API to fetch inventory
      const response = await fetch('/api/inventory')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const items = data.data?.inventory || []
      const result = {
        items,
        total: items.length
      }
      
      console.log(`Loaded ${result.items.length} items from database`)
      setTotalItems(result.total)
      setAllItems(result.items as InventoryItem[]) // Items are already enhanced by the data access layer
      
      // Calculate data quality metrics
      const metrics = {
        itemsWithSalesData: result.items.filter(item => 
          (item.sales_last_30_days && item.sales_last_30_days > 0) || 
          (item.sales_last_90_days && item.sales_last_90_days > 0)
        ).length,
        itemsWithCost: result.items.filter(item => 
          item.cost && item.cost > 0
        ).length,
        itemsWithVendor: result.items.filter(item => 
          item.vendor && item.vendor.trim() !== ''
        ).length,
        lastSyncDate: result.items.length > 0 && result.items[0].last_updated 
          ? result.items[0].last_updated 
          : null
      }
      setDataQualityMetrics(metrics)
      
      // Log data quality warnings
      if (result.items.length === 0) {
        console.warn('⚠️ No inventory data found - sync may be needed')
      } else if (result.items.length < 10) {
        console.warn(`⚠️ Only ${result.items.length} items in inventory - this seems low`)
      }
      
      const salesDataPercent = result.items.length > 0 
        ? (metrics.itemsWithSalesData / result.items.length * 100).toFixed(1)
        : 0
      if (Number(salesDataPercent) < 20) {
        console.warn(`⚠️ Only ${salesDataPercent}% of items have sales data`)
      }
      
      // Set initial page items
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setItems(result.items.slice(startIndex, endIndex) as InventoryItem[])
      
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/inventory/summary')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSummary(data.data)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadInventory(), loadSummary()])
    setRefreshing(false)
  }

  const getStockStatus = (item: InventoryItem) => {
    return getStockStatusDisplay(item as ImportedInventoryItem)
  }

  // Enhanced sorting function
  const handleSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const startEditingStock = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditStock(item.current_stock)
  }

  const startEditingCost = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditCost(item.unit_price || item.cost || 0)
    setShowCostEdit(true)
  }

  const handleStockUpdate = async (itemId: string, newStock?: number) => {
    try {
      const stockValue = newStock !== undefined ? newStock : editStock
      const response = await fetch(`/api/inventory/${itemId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: stockValue })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      const updatedItem = data.data

      // Update local state
      setItems(items.map(item =>
        item.id === itemId ? (updatedItem as InventoryItem) : item
      ))
      setAllItems(allItems.map(item =>
        item.id === itemId ? (updatedItem as InventoryItem) : item
      ))
      setEditingItem(null)
      loadSummary() // Refresh summary
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  const handleCostUpdate = async (itemId: string) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/cost`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: editCost })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      const updatedItem = data.data

      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? (updatedItem as InventoryItem) : item
      ))
      setAllItems(allItems.map(item =>
        item.id === itemId ? (updatedItem as InventoryItem) : item
      ))
      setEditingItem(null)
      setShowCostEdit(false)
      loadSummary() // Refresh summary
    } catch (error) {
      console.error('Error updating cost:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" data-testid="inventory-heading" role="heading" aria-level="1">Inventory Management</h1>
        <div className="flex items-center gap-3">
          <ExportInventory items={filteredItems} filename="inventory" />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{summary.total_items}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{summary.out_of_stock_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.low_stock_count}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">${(summary.total_inventory_value || 0).toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters & View Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6" data-testid="filter-panel">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name, SKU, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="search-input"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-md p-1" data-testid="view-mode-toggle">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="table-view-button"
              aria-selected={viewMode === 'table'}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('planning')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'planning' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="planning-view-button"
              aria-selected={viewMode === 'planning'}
            >
              Planning
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="analytics-view-button"
              aria-selected={viewMode === 'analytics'}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" aria-hidden="true" />
            <select
              value={filterConfig.status}
              onChange={(e) => setFilterConfig({...filterConfig, status: e.target.value as any})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by stock status"
            >
              <option value="all">All Stock Levels</option>
              <option value="critical">Critical (Out/Emergency)</option>
              <option value="low-stock">Low Stock</option>
              <option value="adequate">Adequate Stock</option>
              <option value="overstocked">Overstocked</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Filter by vendor"
            value={filterConfig.vendor}
            onChange={(e) => setFilterConfig({...filterConfig, vendor: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by vendor"
          />

          <input
            type="text"
            placeholder="Filter by location"
            value={filterConfig.location}
            onChange={(e) => setFilterConfig({...filterConfig, location: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by location"
          />

          <select
            value={filterConfig.salesVelocity}
            onChange={(e) => setFilterConfig({...filterConfig, salesVelocity: e.target.value as any})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by sales velocity"
          >
            <option value="all">All Velocities</option>
            <option value="fast">Fast Moving (&gt;1/day)</option>
            <option value="medium">Medium (0.1-1/day)</option>
            <option value="slow">Slow (&gt;0-0.1/day)</option>
            <option value="dead">Dead Stock (0/day)</option>
          </select>

          <select
            value={filterConfig.stockDays}
            onChange={(e) => setFilterConfig({...filterConfig, stockDays: e.target.value as any})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by stock days"
          >
            <option value="all">All Stock Days</option>
            <option value="under-30">Under 30 Days</option>
            <option value="30-60">30-60 Days</option>
            <option value="60-90">60-90 Days</option>
            <option value="over-90">Over 90 Days</option>
            <option value="over-180">Over 180 Days</option>
          </select>

          <button
            onClick={clearAllFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
          >
            Clear Filters
          </button>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
          >
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Price Range:</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterConfig.priceRange.min}
                  onChange={(e) => setFilterConfig({
                    ...filterConfig, 
                    priceRange: { ...filterConfig.priceRange, min: Number(e.target.value) || 0 }
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterConfig.priceRange.max === 999999 ? '' : filterConfig.priceRange.max}
                  onChange={(e) => setFilterConfig({
                    ...filterConfig, 
                    priceRange: { ...filterConfig.priceRange, max: Number(e.target.value) || 999999 }
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterConfig.reorderNeeded}
                  onChange={(e) => setFilterConfig({...filterConfig, reorderNeeded: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Reorder Needed</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterConfig.hasValue}
                  onChange={(e) => setFilterConfig({...filterConfig, hasValue: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Has Value (Price &gt; 0)</span>
              </label>
            </div>
          </div>
        )}

        {/* Preset Filters */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            {presetFilters.map((preset) => {
              const IconComponent = preset.icon
              const isActive = activePresetFilter === preset.id
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPresetFilter(preset.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    isActive 
                      ? `${preset.bgColor} ${preset.color} ${preset.borderColor} border-2` 
                      : `bg-white text-gray-600 border-gray-300 hover:${preset.bgColor} hover:${preset.color}`
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Critical Items Monitor - Real-time alerts */}
      <CriticalItemsMonitor />

      {/* Inventory Overview */}
      <InventoryDataStatus
        totalItems={totalItems}
        itemsWithCost={dataQualityMetrics.itemsWithCost}
        itemsWithVendor={dataQualityMetrics.itemsWithVendor}
        totalValue={summary?.total_inventory_value || 0}
        lastSyncDate={dataQualityMetrics.lastSyncDate}
        onSync={() => window.location.href = '/settings'}
      />

      {/* Enhanced Inventory Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="inventory-table">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'sku', label: 'SKU' },
                    { key: 'product_name', label: 'Product Name' },
                    { key: 'current_stock', label: 'Stock' },
                    { key: 'stock_status_level', label: 'Status' },
                    { key: 'sales_velocity', label: 'Velocity/Day' },
                    { key: 'days_until_stockout', label: 'Days Left' },
                    { key: 'location', label: 'Location' },
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'unit_price', label: 'Cost' },
                    { key: 'sales_last_30_days', label: '30d Sales' },
                    { key: 'trend', label: 'Trend' },
                    { key: 'inventory_value', label: 'Value' },
                    { key: 'actions', label: 'Actions' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => key !== 'actions' && handleSort(key as keyof InventoryItem)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {key !== 'actions' && sortConfig.key === key && (
                          <span className="text-blue-600 font-bold text-lg ml-1">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                        {key !== 'actions' && sortConfig.key !== key && (
                          <span className="text-gray-400 text-xs ml-1">▲▼</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item)
                  const velocity = item.sales_velocity || 0
                  const daysLeft = item.days_until_stockout === Infinity ? '∞' : item.days_until_stockout
                  const trendIcon = {
                    increasing: '📈',
                    decreasing: '📉', 
                    stable: '➡️'
                  }[item.trend || 'stable']

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.product_name || item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <QuickStockAdjust
                          itemId={item.id}
                          sku={item.sku}
                          currentStock={item.current_stock || 0}
                          onUpdate={async (newStock) => {
                            await handleStockUpdate(item.id, newStock)
                            await loadInventory() // Refresh data
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status.color === 'red' ? 'bg-red-100 text-red-800' : ''
                        }${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}${
                          status.color === 'green' ? 'bg-green-100 text-green-800' : ''
                        }${status.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}`}>
                          {status.text}
                        </span>
                        {item.reorder_recommended && (
                          <div className="mt-1">
                            <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                              Reorder Now
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${
                            velocity > 1 ? 'text-green-600' : 
                            velocity > 0.1 ? 'text-yellow-600' : 
                            velocity > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {isNaN(velocity) || !isFinite(velocity) ? '0.00' : velocity.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`font-medium ${
                          typeof daysLeft === 'number' && daysLeft <= 7 ? 'text-red-600' : 
                          typeof daysLeft === 'number' && daysLeft <= 30 ? 'text-yellow-600' : 
                          'text-gray-500'
                        }`}>
                          {daysLeft}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingItem === item.id && showCostEdit ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editCost}
                              onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                              step="0.01"
                              autoFocus
                              aria-label="Edit cost"
                            />
                            <button
                              onClick={() => handleCostUpdate(item.id)}
                              className="text-green-600 hover:text-green-800"
                              aria-label="Save cost update"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(null)
                                setShowCostEdit(false)
                              }}
                              className="text-red-600 hover:text-red-800"
                              aria-label="Cancel cost edit"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            ${((item.unit_price || item.cost || 0) as number).toFixed(2)}
                            <button
                              onClick={() => startEditingCost(item)}
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="Edit cost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.sales_last_30_days || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>{trendIcon}</span>
                          <span className="text-xs text-gray-400">{item.trend}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(() => {
                          const stock = item.current_stock || 0
                          const price = item.unit_price || item.cost || 0
                          const value = stock * price
                          return isNaN(value) || !isFinite(value) ? '$0.00' : `$${value.toFixed(2)}`
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          {(item.current_stock === 0 || item.reorder_recommended) && (
                            <button className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-200 rounded">
                              Create PO
                            </button>
                          )}
                          {item.stock_status_level === 'overstocked' && (
                            <button className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 border border-purple-200 rounded">
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items found matching your criteria
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1) // Reset to first page when changing items per page
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Items per page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
              <span className="text-sm text-gray-700">
                items per page
              </span>
            </div>

            {/* Pagination info and controls */}
            <div className="flex items-center space-x-6">
              {/* Results info */}
              <div className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
              </div>

              {/* Page controls */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Planning Dashboard */}
      {viewMode === 'planning' && (
        <div className="space-y-6">
          {/* Planning Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Critical Action Needed</p>
                  <p className="text-2xl font-bold text-red-700">
                    {filteredItems.filter(item => item.stock_status_level === 'critical').length}
                  </p>
                  <p className="text-xs text-red-500">Out of stock or &lt;7 days</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Reorder Soon</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {filteredItems.filter(item => item.reorder_recommended).length}
                  </p>
                  <p className="text-xs text-yellow-500">Recommended reorders</p>
                </div>
                <TrendingDown className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">30-Day Outlook</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {filteredItems.filter(item => {
                      const days = item.days_until_stockout
                      return typeof days === 'number' && days <= 30 && days > 7
                    }).length}
                  </p>
                  <p className="text-xs text-blue-500">Items may run out</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Overstocked</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {filteredItems.filter(item => item.stock_status_level === 'overstocked').length}
                  </p>
                  <p className="text-xs text-purple-500">Review for clearance</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* 30/60/90 Day Planning Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { days: 30, title: '30-Day Planning', color: 'red' },
              { days: 60, title: '60-Day Planning', color: 'yellow' },
              { days: 90, title: '90-Day Planning', color: 'blue' }
            ].map(({ days, title, color }) => {
              const planningItems = filteredItems.filter(item => {
                const daysLeft = item.days_until_stockout
                return typeof daysLeft === 'number' && daysLeft <= days && daysLeft > 0
              }).sort((a, b) => (a.days_until_stockout || 0) - (b.days_until_stockout || 0))

              return (
                <div key={days} className="bg-white rounded-lg shadow">
                  <div className={`px-4 py-3 border-b bg-${color}-50 border-${color}-200`}>
                    <h3 className={`font-semibold text-${color}-800`}>{title}</h3>
                    <p className={`text-sm text-${color}-600`}>
                      {planningItems.length} items need attention
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {planningItems.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {planningItems.slice(0, 10).map(item => {
                          const daysLeft = item.days_until_stockout
                          const urgency = typeof daysLeft === 'number' && daysLeft <= 7 ? 'urgent' : 
                                        typeof daysLeft === 'number' && daysLeft <= 14 ? 'warning' : 'normal'
                          
                          return (
                            <div key={item.id} className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                                  <p className="text-sm text-gray-500">{item.sku}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm">Stock: {item.current_stock}</span>
                                    <span className="text-sm">Velocity: {((item.sales_velocity || 0) as number).toFixed(2)}/day</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                                    urgency === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {daysLeft} days
                                  </span>
                                  {item.reorder_recommended && (
                                    <div className="mt-1">
                                      <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        Reorder
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {planningItems.length > 10 && (
                          <div className="p-3 text-center text-sm text-gray-500">
                            +{planningItems.length - 10} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No items expected to run out in {days} days</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Velocity Analysis */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Sales Velocity Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: 'Fast Moving (&gt;1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 1).length, color: 'green' },
                  { label: 'Medium (0.1-1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 0.1 && (i.sales_velocity || 0) <= 1).length, color: 'yellow' },
                  { label: 'Slow (&gt;0-0.1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 0 && (i.sales_velocity || 0) <= 0.1).length, color: 'orange' },
                  { label: 'Dead Stock (0/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) === 0).length, color: 'red' }
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <div className={`h-3 w-16 bg-${color}-200 rounded-full`}>
                        <div className={`h-full bg-${color}-500 transition-all duration-300 rounded-full`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Demand Trends</h3>
              <div className="space-y-3">
                {[
                  { trend: 'increasing', label: 'Increasing Demand', icon: '📈', color: 'green' },
                  { trend: 'stable', label: 'Stable Demand', icon: '➡️', color: 'blue' },
                  { trend: 'decreasing', label: 'Decreasing Demand', icon: '📉', color: 'red' }
                ].map(({ trend, label, icon, color }) => {
                  const count = filteredItems.filter(i => i.trend === trend).length
                  return (
                    <div key={trend} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span className="text-sm text-gray-600">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className={`text-xs px-2 py-1 bg-${color}-100 text-${color}-800 rounded`}>
                          {((count / filteredItems.length) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Items by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Top Fast-Moving Items</h3>
              <div className="space-y-3">
                {filteredItems
                  .filter(item => (item.sales_velocity || 0) > 0)
                  .sort((a, b) => (b.sales_velocity || 0) - (a.sales_velocity || 0))
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{((item.sales_velocity || 0) as number).toFixed(2)}/day</p>
                        <p className="text-sm text-gray-500">{item.sales_last_30_days || 0} sold</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Dead Stock Alert</h3>
              <div className="space-y-3">
                {filteredItems
                  .filter(item => (item.sales_velocity || 0) === 0 && item.current_stock > 0)
                  .sort((a, b) => (b.current_stock * (b.unit_price || b.cost || 0)) - (a.current_stock * (a.unit_price || a.cost || 0)))
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">${((item.current_stock || 0) * (item.unit_price || item.cost || 0)).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{item.current_stock} units</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


