import { useState, useEffect, useMemo } from 'react'
import { FilterConfig } from '@/app/components/inventory/EnhancedQuickFilters'

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
  sales_velocity?: number
  days_until_stockout?: number
  reorder_recommended?: boolean
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  trend?: 'increasing' | 'decreasing' | 'stable'
}

interface FilterCounts {
  [key: string]: number
}

export function useEnhancedInventoryFilters(items: InventoryItem[]) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
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

  // BuildASoil manufacturing vendors
  const manufacturingVendors = [
    'BuildASoil Soil Production',
    'BuildASoil Manufacturing',
    'BuildASoil Family Farms'
  ]

  // Helper function to determine if item is manufactured
  const isManufacturedItem = (item: InventoryItem): boolean => {
    if (!item.vendor) return false
    return manufacturingVendors.includes(item.vendor)
  }

  // Calculate filter counts for each quick filter
  const filterCounts = useMemo((): FilterCounts => {
    const counts: FilterCounts = {
      'out-of-stock': 0,
      'reorder-needed': 0,
      'dead-stock': 0,
      'overstocked': 0,
      'fast-moving': 0,
      'low-value': 0,
      'critical-stock': 0,
      'purchased-items': 0,
      'manufactured-items': 0
    }

    items.forEach(item => {
      // Out of Stock
      if (item.current_stock === 0) {
        counts['out-of-stock']++
      }

      // Reorder Needed
      if (item.reorder_recommended || 
          (item.reorder_point && item.current_stock <= item.reorder_point)) {
        counts['reorder-needed']++
      }

      // Dead Stock (no sales in 180+ days and has stock)
      if (item.current_stock > 0 && 
          item.days_until_stockout && item.days_until_stockout > 180 &&
          (!item.sales_last_90_days || item.sales_last_90_days === 0)) {
        counts['dead-stock']++
      }

      // Overstocked
      if (item.stock_status_level === 'overstocked' || 
          (item.days_until_stockout && item.days_until_stockout > 90)) {
        counts['overstocked']++
      }

      // Fast Moving
      if (item.current_stock > 0 && item.sales_velocity && item.sales_velocity > 0.5) {
        counts['fast-moving']++
      }

      // Low Value (under $50)
      if ((item.unit_price && item.unit_price < 50) || 
          (item.cost && item.cost < 50)) {
        counts['low-value']++
      }

      // Critical Stock (low stock with less than 30 days supply)
      if (item.stock_status_level === 'critical' || 
          item.stock_status_level === 'low' ||
          (item.days_until_stockout && item.days_until_stockout < 30 && item.current_stock > 0)) {
        counts['critical-stock']++
      }

      // Purchased vs Manufactured
      if (isManufacturedItem(item)) {
        counts['manufactured-items']++
      } else if (item.vendor) {
        // Has vendor but not in manufacturing list = purchased
        counts['purchased-items']++
      }
    })

    return counts
  }, [items])

  // Apply filters to items
  const filteredItems = useMemo(() => {
    if (activeFilter === null) {
      return items
    }

    return items.filter(item => {
      // Status filter
      if (filterConfig.status !== 'all') {
        switch (filterConfig.status) {
          case 'out-of-stock':
            if (item.current_stock !== 0) return false
            break
          case 'in-stock':
            if (item.current_stock <= 0) return false
            break
          case 'low-stock':
            if (item.stock_status_level !== 'low' && item.stock_status_level !== 'critical') return false
            break
          case 'critical':
            if (item.stock_status_level !== 'critical') return false
            break
          case 'overstocked':
            if (item.stock_status_level !== 'overstocked') return false
            break
          case 'adequate':
            if (item.stock_status_level !== 'adequate') return false
            break
        }
      }

      // Vendor filter
      if (filterConfig.vendor && filterConfig.vendor !== '') {
        if (!item.vendor || !item.vendor.toLowerCase().includes(filterConfig.vendor.toLowerCase())) {
          return false
        }
      }

      // Location filter
      if (filterConfig.location && filterConfig.location !== '') {
        if (!item.location || !item.location.toLowerCase().includes(filterConfig.location.toLowerCase())) {
          return false
        }
      }

      // Price range filter
      const itemPrice = item.unit_price || item.cost || 0
      if (itemPrice < filterConfig.priceRange.min || itemPrice > filterConfig.priceRange.max) {
        return false
      }

      // Cost range filter
      const itemCost = item.cost || 0
      if (itemCost < filterConfig.costRange.min || itemCost > filterConfig.costRange.max) {
        return false
      }

      // Stock range filter
      if (item.current_stock < filterConfig.stockRange.min || item.current_stock > filterConfig.stockRange.max) {
        return false
      }

      // Sales velocity filter
      if (filterConfig.salesVelocity !== 'all') {
        const velocity = item.sales_velocity || 0
        switch (filterConfig.salesVelocity) {
          case 'fast':
            if (velocity <= 0.5) return false
            break
          case 'medium':
            if (velocity <= 0.2 || velocity > 0.5) return false
            break
          case 'slow':
            if (velocity <= 0.05 || velocity > 0.2) return false
            break
          case 'dead':
            if (velocity > 0.05) return false
            break
        }
      }

      // Stock days filter
      if (filterConfig.stockDays !== 'all') {
        const daysUntilStockout = item.days_until_stockout || 0
        switch (filterConfig.stockDays) {
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
            if (daysUntilStockout < 90) return false
            break
          case 'over-180':
            if (daysUntilStockout < 180) return false
            break
        }
      }

      // Reorder needed filter
      if (filterConfig.reorderNeeded) {
        if (!item.reorder_recommended && 
            !(item.reorder_point && item.current_stock <= item.reorder_point)) {
          return false
        }
      }

      // Has value filter (items with cost/price data)
      if (filterConfig.hasValue) {
        if (!item.cost && !item.unit_price) {
          return false
        }
      }

      // Source type filter (purchased vs manufactured)
      if (filterConfig.sourceType !== 'all') {
        if (filterConfig.sourceType === 'manufactured') {
          if (!isManufacturedItem(item)) {
            return false
          }
        } else if (filterConfig.sourceType === 'purchased') {
          if (isManufacturedItem(item) || !item.vendor) {
            return false
          }
        }
      }

      return true
    })
  }, [items, filterConfig, activeFilter])

  const applyFilter = (config: FilterConfig, filterId?: string) => {
    setFilterConfig(config)
    setActiveFilter(filterId || 'custom')
  }

  const clearFilters = () => {
    setFilterConfig({
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
    setActiveFilter(null)
  }

  return {
    filteredItems,
    filterCounts,
    activeFilter,
    filterConfig,
    applyFilter,
    clearFilters
  }
}
