import { useState, useEffect } from 'react'
import { X, Filter, Search } from 'lucide-react'
import { InventoryFilters } from '@/app/types'

interface InventoryFiltersProps {
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
  vendors: string[]
  locations: string[]
}

export function InventoryFiltersComponent({
  filters,
  onFiltersChange,
  vendors,
  locations
}: InventoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Debounce search input
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchTerm })
    }, 300)

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchTerm])

  const handleFilterChange = (key: keyof InventoryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
    setSearchTerm('')
  }

  const activeFilterCount = Object.entries(filters)
    .filter(([key, value]) => {
      if (key === 'search') return false
      if (key === 'status' && value === 'all') return false
      if (key === 'salesVelocity' && value === 'all') return false
      if (key === 'stockDays' && value === 'all') return false
      return value !== undefined && value !== '' && value !== null
    }).length

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SKU or product name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
            activeFilterCount > 0 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          data-testid="filter-button"
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Status
              </label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by stock status"
                data-testid="filter-status"
              >
                <option value="all">All Items</option>
                <option value="in-stock">In Stock</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="critical">Critical</option>
                <option value="low-stock">Low Stock</option>
                <option value="adequate">Adequate</option>
                <option value="overstocked">Overstocked</option>
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                value={filters.vendor || ''}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Sales Velocity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Velocity
              </label>
              <select
                value={filters.salesVelocity || 'all'}
                onChange={(e) => handleFilterChange('salesVelocity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by sales velocity"
                data-testid="filter-velocity"
              >
                <option value="all">All Velocities</option>
                <option value="fast">Fast Moving (&gt;1/day)</option>
                <option value="medium">Medium (0.1-1/day)</option>
                <option value="slow">Slow (&lt;0.1/day)</option>
                <option value="dead">Dead Stock (0/day)</option>
              </select>
            </div>

            {/* Stock Days Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days of Stock
              </label>
              <select
                value={filters.stockDays || 'all'}
                onChange={(e) => handleFilterChange('stockDays', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="under-30">Under 30 days</option>
                <option value="30-60">30-60 days</option>
                <option value="60-90">60-90 days</option>
                <option value="over-90">Over 90 days</option>
                <option value="over-180">Over 180 days</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.status && filters.status !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Status: {filters.status}
                  <button
                    onClick={() => handleFilterChange('status', undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.vendor && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Vendor: {filters.vendor}
                  <button
                    onClick={() => handleFilterChange('vendor', undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Location: {filters.location}
                  <button
                    onClick={() => handleFilterChange('location', undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.salesVelocity && filters.salesVelocity !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Velocity: {filters.salesVelocity}
                  <button
                    onClick={() => handleFilterChange('salesVelocity', undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.stockDays && filters.stockDays !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Stock Days: {filters.stockDays}
                  <button
                    onClick={() => handleFilterChange('stockDays', undefined)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  Price: ${filters.minPrice || 0} - ${filters.maxPrice || '∞'}
                  <button
                    onClick={() => {
                      handleFilterChange('minPrice', undefined)
                      handleFilterChange('maxPrice', undefined)
                    }}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}