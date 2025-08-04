import { 
  AlertCircle, 
  AlertTriangle, 
  Zap, 
  Archive, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock,
  ShoppingCart,
  Package,
  Factory
} from 'lucide-react'
import { QuickFilter } from '../components/common/UniversalQuickFilters'
import { InventoryItem } from '../types'
import { Vendor } from '../lib/data-access/vendors'

// Inventory Quick Filters
export const inventoryQuickFilters: QuickFilter<InventoryItem>[] = [
  {
    id: 'out-of-stock',
    label: 'Out of Stock',
    icon: AlertCircle,
    color: 'red',
    filter: (item: InventoryItem) => (item.current_stock || 0) === 0
  },
  {
    id: 'low-stock',
    label: 'Low Stock',
    icon: AlertTriangle,
    color: 'orange',
    filter: (item: InventoryItem) => {
      const stock = item.current_stock || 0
      const reorderPoint = item.reorder_point || 0
      return stock > 0 && stock <= reorderPoint
    }
  },
  {
    id: 'reorder-needed',
    label: 'Reorder Needed',
    icon: Zap,
    color: 'yellow',
    filter: (item: InventoryItem) => item.reorder_recommended === true
  },
  {
    id: 'overstocked',
    label: 'Overstocked',
    icon: BarChart3,
    color: 'blue',
    filter: (item: InventoryItem) => {
      const stock = item.current_stock || 0
      const maxStock = item.maximum_stock || 0
      return maxStock > 0 && stock > maxStock
    }
  },
  {
    id: 'fast-moving',
    label: 'Fast Moving',
    icon: TrendingUp,
    color: 'green',
    filter: (item: InventoryItem) => {
      const velocity = item.sales_velocity || 0
      return velocity > 1.0 && (item.current_stock || 0) > 0
    }
  },
  {
    id: 'dead-stock',
    label: 'Dead Stock',
    icon: Archive,
    color: 'gray',
    filter: (item: InventoryItem) => {
      const velocity = item.sales_velocity || 0
      const stock = item.current_stock || 0
      const cost = item.cost || 0
      return velocity === 0 && stock > 0 && cost > 0
    }
  },
  {
    id: 'high-value',
    label: 'High Value',
    icon: DollarSign,
    color: 'purple',
    filter: (item: InventoryItem) => {
      const cost = item.cost || 0
      const stock = item.current_stock || 0
      const totalValue = cost * stock
      return totalValue > 1000
    }
  },
  {
    id: 'buildasoil-products',
    label: 'BuildASoil Products',
    icon: Factory,
    color: 'green',
    filter: (item: InventoryItem) => {
      return item.vendor?.toLowerCase().includes('buildasoil') || false
    }
  }
]

// Vendor Quick Filters (will need VendorStats interface)
export interface VendorWithStats extends Vendor {
  stats?: {
    totalItems: number
    totalPurchaseOrders: number
    totalSpend: number
    averageOrderValue: number
    lastOrderDate: string | null
    ordersByStatus: {
      draft: number
      submitted: number
      approved: number
    }
    inventoryStats: {
      totalValue: number
      lowStockItems: number
      outOfStockItems: number
      fastMovingItems: number
      inStockItems: number
    }
  }
}

export const vendorQuickFilters: QuickFilter<VendorWithStats>[] = [
  {
    id: 'active-orders',
    label: 'Active Orders',
    icon: ShoppingCart,
    color: 'blue',
    filter: (vendor: VendorWithStats) => {
      const activeOrders = (vendor.stats?.ordersByStatus.submitted || 0) + 
                          (vendor.stats?.ordersByStatus.approved || 0)
      return activeOrders > 0
    }
  },
  {
    id: 'high-spend',
    label: 'High Spend',
    icon: DollarSign,
    color: 'green',
    filter: (vendor: VendorWithStats) => (vendor.stats?.totalSpend || 0) > 10000
  },
  {
    id: 'recent-orders',
    label: 'Recent Orders',
    icon: Clock,
    color: 'purple',
    filter: (vendor: VendorWithStats) => {
      if (!vendor.stats?.lastOrderDate) return false
      const daysSince = (Date.now() - new Date(vendor.stats.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 30
    }
  },
  {
    id: 'many-items',
    label: 'Many Items',
    icon: Package,
    color: 'orange',
    filter: (vendor: VendorWithStats) => (vendor.stats?.totalItems || 0) > 50
  },
  {
    id: 'low-stock-suppliers',
    label: 'Low Stock Items',
    icon: AlertTriangle,
    color: 'red',
    filter: (vendor: VendorWithStats) => (vendor.stats?.inventoryStats.lowStockItems || 0) > 0
  },
  {
    id: 'high-value-inventory',
    label: 'High Value Inventory',
    icon: BarChart3,
    color: 'purple',
    filter: (vendor: VendorWithStats) => (vendor.stats?.inventoryStats.totalValue || 0) > 50000
  }
]

// Filter configurations for different contexts
export const getInventoryFilters = (context?: 'all' | 'critical' | 'operational'): QuickFilter<InventoryItem>[] => {
  switch (context) {
    case 'critical':
      return inventoryQuickFilters.filter(f => 
        ['out-of-stock', 'low-stock', 'reorder-needed'].includes(f.id)
      )
    case 'operational':
      return inventoryQuickFilters.filter(f => 
        ['overstocked', 'fast-moving', 'dead-stock', 'high-value'].includes(f.id)
      )
    default:
      return inventoryQuickFilters
  }
}

export const getVendorFilters = (context?: 'all' | 'active' | 'performance'): QuickFilter<VendorWithStats>[] => {
  switch (context) {
    case 'active':
      return vendorQuickFilters.filter(f => 
        ['active-orders', 'recent-orders'].includes(f.id)
      )
    case 'performance':
      return vendorQuickFilters.filter(f => 
        ['high-spend', 'many-items', 'high-value-inventory'].includes(f.id)
      )
    default:
      return vendorQuickFilters
  }
}
