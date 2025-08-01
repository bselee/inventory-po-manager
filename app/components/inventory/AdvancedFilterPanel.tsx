'use client'

import React, { useState, useEffect } from 'react'
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
  Eye,
  EyeOff
} from 'lucide-react'
import { TableFilterConfig, PresetFilter, ColumnConfig } from '@/app/types'
import { InventoryItem } from '@/app/types'
import ColumnSelector from './ColumnSelector'

interface AdvancedFilterPanelProps {
  filterConfig: TableFilterConfig
  onFilterChange: (updates: Partial<TableFilterConfig>) => void
  onClearFilters: () => void
  presetFilters: PresetFilter[]
  activePresetFilter: string | null
  onApplyPresetFilter: (presetId: string) => void
  filterCounts: Record<string, number>
  uniqueVendors: string[]
  uniqueLocations: string[]
  columns: ColumnConfig[]
  onToggleColumn: (columnKey: keyof InventoryItem | 'actions') => void
  onReorderColumns: (dragIndex: number, hoverIndex: number) => void
  onResetColumns: () => void
  className?: string
}

export default function AdvancedFilterPanel({
  filterConfig,
  onFilterChange,
  onClearFilters,
  presetFilters,
  activePresetFilter,
  onApplyPresetFilter,
  filterCounts,
  uniqueVendors,
  uniqueLocations,
  columns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  className = ''
}: AdvancedFilterPanelProps) {
  // Collapsible state with localStorage persistence
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-filter-panel-expanded')
      return saved !== null ? JSON.parse(saved) : false // Default to collapsed
    }
    return false
  })
  
  const [showPresets, setShowPresets] = useState(true)

  // Save collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory-filter-panel-expanded', JSON.stringify(isExpanded))
    }
  }, [isExpanded])

  // Count active filters
  const activeFiltersCount = Object.entries(filterConfig).filter(([key, value]) => {
    if (key === 'search') return value !== ''
    if (key === 'status') return value !== 'all'
    if (key === 'salesVelocity') return value !== 'all'
    if (key === 'stockDays') return value !== 'all'
    if (key === 'vendor' || key === 'location') return value !== ''
    if (key === 'minPrice') return (value as number) > 0
    if (key === 'maxPrice') return (value as number) < 999999
    if (key === 'minStock') return (value as number) > 0
    if (key === 'maxStock') return (value as number) < 999999
    if (key === 'reorderNeeded' || key === 'hasValue') return value === true
    if (key === 'showManufactured' || key === 'showPurchased') return value === false
    if (key === 'showHidden') return value === true
    return false
  }).length

  const getPresetButtonColor = (preset: PresetFilter) => {
    const colors = {
      red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      gray: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
    }
    return colors[preset.color as keyof typeof colors] || colors.gray
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-300 ${className}`}>
      {/* Collapsible Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-2 text-left hover:text-gray-700 transition-colors"
          >
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Filters & Search
            </h3>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {activeFiltersCount} active
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={onClearFilters}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </button>
            )}
            
            <ColumnSelector
              columns={columns}
              onToggleColumn={onToggleColumn}
              onReorderColumns={onReorderColumns}
              onResetColumns={onResetColumns}
            />
          </div>
        </div>

        {/* Quick Search Bar - Always Visible */}
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={filterConfig.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Preset Filters */}
          {showPresets && presetFilters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Quick Filters
                </h4>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPresets ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {presetFilters.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPresetFilter(preset.id)}
                    className={`px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                      activePresetFilter === preset.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : getPresetButtonColor(preset)
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{preset.name}</span>
                      {filterCounts[preset.id] !== undefined && (
                        <span className="ml-2 text-xs opacity-75">
                          {filterCounts[preset.id]}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Status
              </label>
              <select
                aria-label="Stock Status Filter"
                value={filterConfig.status}
                onChange={(e) => onFilterChange({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor
              </label>
              <select
                aria-label="Vendor Filter"
                value={filterConfig.vendor}
                onChange={(e) => onFilterChange({ vendor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Vendors</option>
                {uniqueVendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                aria-label="Location Filter"
                value={filterConfig.location}
                onChange={(e) => onFilterChange({ location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filterConfig.minPrice || ''}
                onChange={(e) => onFilterChange({ minPrice: Number(e.target.value) || 0 })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filterConfig.maxPrice === 999999 ? '' : filterConfig.maxPrice || ''}
                onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) || 999999 })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Stock Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="inline h-4 w-4 mr-1" />
              Stock Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filterConfig.minStock || ''}
                onChange={(e) => onFilterChange({ minStock: Number(e.target.value) || 0 })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filterConfig.maxStock === 999999 ? '' : filterConfig.maxStock || ''}
                onChange={(e) => onFilterChange({ maxStock: Number(e.target.value) || 999999 })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reorderNeeded"
                checked={filterConfig.reorderNeeded}
                onChange={(e) => onFilterChange({ reorderNeeded: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="reorderNeeded" className="ml-2 text-sm text-gray-700">
                Reorder Needed
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasValue"
                checked={filterConfig.hasValue}
                onChange={(e) => onFilterChange({ hasValue: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="hasValue" className="ml-2 text-sm text-gray-700">
                Has Inventory Value
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showHidden"
                checked={filterConfig.showHidden}
                onChange={(e) => onFilterChange({ showHidden: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showHidden" className="ml-2 text-sm text-gray-700 flex items-center gap-1">
                {filterConfig.showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Show Hidden Items
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showManufactured"
                checked={filterConfig.showManufactured}
                onChange={(e) => onFilterChange({ showManufactured: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showManufactured" className="ml-2 text-sm text-gray-700">
                Show Manufactured Items
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showPurchased"
                checked={filterConfig.showPurchased}
                onChange={(e) => onFilterChange({ showPurchased: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showPurchased" className="ml-2 text-sm text-gray-700">
                Show Purchased Items
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
