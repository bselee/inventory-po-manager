'use client'

import React, { useState } from 'react'
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
  Star
} from 'lucide-react'
import { TableFilterConfig, PresetFilter } from '@/app/hooks/useInventoryTableManager'

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
  className = ''
}: AdvancedFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPresets, setShowPresets] = useState(true)

  // Count active filters
  const activeFiltersCount = Object.entries(filterConfig).filter(([key, value]) => {
    if (key === 'search') return value !== ''
    if (key === 'status') return value !== 'all'
    if (key === 'salesVelocity') return value !== 'all'
    if (key === 'stockDays') return value !== 'all'
    if (key === 'vendor' || key === 'location') return value !== ''
    if (key === 'minPrice') return value > 0
    if (key === 'maxPrice') return value < 999999
    if (key === 'minStock') return value > 0
    if (key === 'maxStock') return value < 999999
    if (key === 'reorderNeeded' || key === 'hasValue') return value === true
    if (key === 'showManufactured' || key === 'showPurchased') return value === false
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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Filters & Search
            </h3>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {activeFiltersCount} active
              </span>
            )}
          </div>
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
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Always visible */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={filterConfig.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search by product name, SKU, vendor, or location..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="search-input"
          />
          {filterConfig.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              title="Clear search input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preset Filters - Collapsible */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">Quick Filters</span>
          </div>
          {showPresets ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        
        {showPresets && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {presetFilters.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPresetFilter(preset.id)}
                  className={`relative p-3 text-left border rounded-lg transition-all ${
                    activePresetFilter === preset.id
                      ? 'ring-2 ring-blue-500 border-blue-300'
                      : getPresetButtonColor(preset)
                  }`}
                  title={preset.description}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg" role="img" aria-label={preset.name}>
                      {preset.icon}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {preset.name}
                    </span>
                  </div>
                  <div className="text-xs opacity-75 mb-2">
                    {filterCounts[preset.id] || 0} items
                  </div>
                  {activePresetFilter === preset.id && (
                    <div className="absolute top-1 right-1">
                      <Star className="h-3 w-3 text-blue-600 fill-current" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters - Expandable */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Status
              </label>
              <select
                value={filterConfig.status}
                onChange={(e) => onFilterChange({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by stock status"
              >
                <option value="all">All Status</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="critical">Critical Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="adequate">Adequate Stock</option>
                <option value="overstocked">Overstocked</option>
                <option value="in-stock">In Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                value={filterConfig.vendor}
                onChange={(e) => onFilterChange({ vendor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by vendor"
              >
                <option value="">All Vendors</option>
                {uniqueVendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={filterConfig.location}
                onChange={(e) => onFilterChange({ location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by location"
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

          {/* Sales & Performance Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Velocity
              </label>
              <select
                value={filterConfig.salesVelocity}
                onChange={(e) => onFilterChange({ salesVelocity: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by sales velocity"
              >
                <option value="all">All Velocities</option>
                <option value="fast">Fast Moving (&gt;1/day)</option>
                <option value="medium">Medium (0.1-1/day)</option>
                <option value="slow">Slow (&gt;0-0.1/day)</option>
                <option value="dead">Dead Stock (0/day)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Days Remaining
              </label>
              <select
                value={filterConfig.stockDays}
                onChange={(e) => onFilterChange({ stockDays: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by stock days"
              >
                <option value="all">All Stock Days</option>
                <option value="under-30">Under 30 Days</option>
                <option value="30-60">30-60 Days</option>
                <option value="60-90">60-90 Days</option>
                <option value="over-90">Over 90 Days</option>
                <option value="over-180">Over 180 Days</option>
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Price Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filterConfig.minPrice || ''}
                onChange={(e) => onFilterChange({ minPrice: Number(e.target.value) || 0 })}
                placeholder="Min price"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={filterConfig.maxPrice === 999999 ? '' : filterConfig.maxPrice}
                onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) || 999999 })}
                placeholder="Max price"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Stock Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Package className="inline h-4 w-4 mr-1" />
              Stock Quantity Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filterConfig.minStock || ''}
                onChange={(e) => onFilterChange({ minStock: Number(e.target.value) || 0 })}
                placeholder="Min stock"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={filterConfig.maxStock === 999999 ? '' : filterConfig.maxStock}
                onChange={(e) => onFilterChange({ maxStock: Number(e.target.value) || 999999 })}
                placeholder="Max stock"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterConfig.reorderNeeded}
                onChange={(e) => onFilterChange({ reorderNeeded: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Reorder Needed</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterConfig.hasValue}
                onChange={(e) => onFilterChange({ hasValue: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Has Value (Price &gt; 0)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterConfig.showManufactured}
                onChange={(e) => onFilterChange({ showManufactured: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Manufactured</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterConfig.showPurchased}
                onChange={(e) => onFilterChange({ showPurchased: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Purchased</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
