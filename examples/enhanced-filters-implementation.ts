// Enhanced Quick Filters Implementation Example
// This shows how to enable the advanced filtering system in your inventory page

import React, { useState } from 'react'
import { Factory, AlertTriangle, Calendar } from 'lucide-react'
import { InventoryItem } from '@/app/types'
import EnhancedQuickFilters, { SavedFilter } from '@/app/components/inventory/EnhancedQuickFilters'
import { useEnhancedInventoryFiltering } from '@/app/hooks/useEnhancedInventoryFiltering'

export default function InventoryPageWithEnhancedFilters() {
  // Your existing inventory data
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  
  // Enhanced filtering hook with saved filters support
  const {
    filteredItems,
    filterCounts,
    activeFilterId,
    applyFilter,
    clearFilters
  } = useEnhancedInventoryFiltering(allItems)

  return (
    <div className="space-y-6">
      {/* Enhanced Quick Filters with Save Functionality */}
      <EnhancedQuickFilters
        activeFilter={activeFilterId}
        onFilterChange={applyFilter}
        onClearFilters={clearFilters}
        itemCounts={filterCounts}
        className="bg-white rounded-lg shadow p-6"
      />

      {/* Placeholder for inventory table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Filtered Items: {filteredItems.length}</h3>
        {/* EnhancedInventoryTable would go here */}
      </div>
    </div>
  )
}

// Custom Filter Configuration Example
export const customBuildASoilFilters = [
  {
    id: 'custom-manufacturing',
    label: 'Manufacturing Queue',
    icon: Factory,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    borderColor: 'border-emerald-200',
    description: 'Items ready for manufacturing or in production',
    config: {
      status: 'low-stock',
      vendor: 'BuildASoil',
      reorderNeeded: true,
      showManufactured: true,
      stockDays: 'under-30'
    }
  },
  {
    id: 'supplier-critical',
    label: 'Supplier Critical',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
    borderColor: 'border-red-200',
    description: 'External supplier items that need immediate attention',
    config: {
      status: 'out-of-stock',
      showPurchased: true,
      reorderNeeded: true,
      salesVelocity: 'fast'
    }
  },
  {
    id: 'seasonal-prep',
    label: 'Seasonal Prep',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
    description: 'Items to prepare for upcoming season',
    config: {
      salesVelocity: 'fast',
      stockDays: '30-60',
      status: 'adequate'
    }
  }
]

// User Settings Storage Example
export class FilterSettingsManager {
  private static STORAGE_KEY = 'inventory-filter-settings'
  
  static saveUserSettings(settings: UserFilterSettings) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings))
  }
  
  static loadUserSettings(): UserFilterSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY)
    return saved ? JSON.parse(saved) : {
      defaultFilters: [],
      customFilters: [],
      panelExpanded: false,
      autoApplyLastFilter: false
    }
  }
  
  static addCustomFilter(filter: SavedFilter) {
    const settings = this.loadUserSettings()
    settings.customFilters.push(filter)
    this.saveUserSettings(settings)
  }
}

interface UserFilterSettings {
  defaultFilters: string[]        // IDs of filters to show by default
  customFilters: SavedFilter[]    // User's saved custom filters  
  panelExpanded: boolean          // Filter panel state
  autoApplyLastFilter: boolean    // Auto-apply last used filter
}
