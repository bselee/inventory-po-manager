import React, { useMemo } from 'react'
import { LucideIcon, X } from 'lucide-react'

export interface QuickFilter<T = any> {
  id: string
  label: string
  icon?: LucideIcon
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'
  filter: (item: T) => boolean
  count?: number
}

export interface UniversalQuickFiltersProps<T = any> {
  items: T[]
  filters: QuickFilter<T>[]
  activeFilter?: string
  onFilterChange: (filterId: string) => void
  onClearFilters: () => void
  showCounts?: boolean
  className?: string
}

const colorClasses = {
  red: {
    active: 'bg-red-50 text-red-700 border-red-200',
    inactive: 'text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
  },
  orange: {
    active: 'bg-orange-50 text-orange-700 border-orange-200',
    inactive: 'text-orange-600 hover:bg-orange-50 border-transparent hover:border-orange-200'
  },
  yellow: {
    active: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    inactive: 'text-yellow-600 hover:bg-yellow-50 border-transparent hover:border-yellow-200'
  },
  green: {
    active: 'bg-green-50 text-green-700 border-green-200',
    inactive: 'text-green-600 hover:bg-green-50 border-transparent hover:border-green-200'
  },
  blue: {
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    inactive: 'text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-200'
  },
  purple: {
    active: 'bg-purple-50 text-purple-700 border-purple-200',
    inactive: 'text-purple-600 hover:bg-purple-50 border-transparent hover:border-purple-200'
  },
  gray: {
    active: 'bg-gray-50 text-gray-700 border-gray-200',
    inactive: 'text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-200'
  }
}

export default function UniversalQuickFilters<T>({
  items,
  filters,
  activeFilter,
  onFilterChange,
  onClearFilters,
  showCounts = true,
  className = ""
}: UniversalQuickFiltersProps<T>) {
  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    filters.forEach(filter => {
      counts[filter.id] = items.filter(filter.filter).length
    })
    
    return counts
  }, [items, filters])

  // Update filter objects with calculated counts
  const filtersWithCounts = useMemo(() => {
    return filters.map(filter => ({
      ...filter,
      count: filterCounts[filter.id] || 0
    }))
  }, [filters, filterCounts])

  if (filters.length === 0) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
          {activeFilter && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {filtersWithCounts.map((filter) => {
            const isActive = activeFilter === filter.id
            const Icon = filter.icon
            const colorClass = colorClasses[filter.color || 'blue']
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md transition-colors ${
                  isActive ? colorClass.active : colorClass.inactive
                }`}
                disabled={showCounts && filter.count === 0}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{filter.label}</span>
                {showCounts && (
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-current' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {activeFilter && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filterCounts[activeFilter]} of {items.length} items
          </div>
        )}
      </div>
    </div>
  )
}
