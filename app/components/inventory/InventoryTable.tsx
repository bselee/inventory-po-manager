import { useState } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Edit2, 
  Check, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus 
} from 'lucide-react'
import { InventoryItem } from '@/app/types'
import { 
  getStockStatusDisplay, 
  formatInventoryValue 
} from '@/app/lib/inventory-calculations'

interface InventoryTableProps {
  items: InventoryItem[]
  onSort: (key: keyof InventoryItem) => void
  sortConfig: {
    key: keyof InventoryItem
    direction: 'asc' | 'desc'
  }
  onUpdateStock: (id: string, newStock: number) => Promise<void>
  onUpdateCost: (id: string, newCost: number) => Promise<void>
  loading?: boolean
}

export function InventoryTable({
  items,
  onSort,
  sortConfig,
  onUpdateStock,
  onUpdateCost,
  loading = false
}: InventoryTableProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editStock, setEditStock] = useState<number>(0)
  const [editCost, setEditCost] = useState<number>(0)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)

  const startEditingStock = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditStock(item.current_stock)
  }

  const startEditingCost = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditCost(item.unit_price || item.cost || 0)
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditStock(0)
    setEditCost(0)
  }

  const saveStock = async (id: string) => {
    try {
      setUpdatingItem(id)
      await onUpdateStock(id, editStock)
      setEditingItem(null)
    } catch (error) {
      logError('Failed to update stock:', error)
    } finally {
      setUpdatingItem(null)
    }
  }

  const saveCost = async (id: string) => {
    try {
      setUpdatingItem(id)
      await onUpdateCost(id, editCost)
      setEditingItem(null)
    } catch (error) {
      logError('Failed to update cost:', error)
    } finally {
      setUpdatingItem(null)
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const SortIcon = ({ column }: { column: keyof InventoryItem }) => {
    if (sortConfig.key !== column) {
      return <ChevronUp className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-500" />
      : <ChevronDown className="h-4 w-4 text-blue-500" />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('sku')}
            >
              <div className="flex items-center justify-between">
                SKU
                <SortIcon column="sku" />
              </div>
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('product_name')}
            >
              <div className="flex items-center justify-between">
                Product
                <SortIcon column="product_name" />
              </div>
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('current_stock')}
            >
              <div className="flex items-center justify-between">
                Stock
                <SortIcon column="current_stock" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('sales_velocity')}
            >
              <div className="flex items-center justify-between">
                Velocity
                <SortIcon column="sales_velocity" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trend
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('days_until_stockout')}
            >
              <div className="flex items-center justify-between">
                Days Left
                <SortIcon column="days_until_stockout" />
              </div>
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('unit_price')}
            >
              <div className="flex items-center justify-between">
                Cost
                <SortIcon column="unit_price" />
              </div>
            </th>
            <th 
              className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('vendor')}
            >
              <div className="flex items-center justify-between">
                Vendor
                <SortIcon column="vendor" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr 
              key={item.id} 
              className={`hover:bg-gray-50 ${
                item.reorder_recommended ? 'bg-red-50' : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.sku}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.product_name || item.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {editingItem === item.id && updatingItem !== item.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border rounded"
                      min="0"
                    />
                    <button
                      onClick={() => saveStock(item.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{item.current_stock}</span>
                    <button
                      onClick={() => startEditingStock(item)}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={updatingItem === item.id}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.stock_status_level === 'critical' ? 'bg-red-100 text-red-800' :
                  item.stock_status_level === 'low' ? 'bg-yellow-100 text-yellow-800' :
                  item.stock_status_level === 'adequate' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {getStockStatusDisplay(item).text}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.sales_velocity !== undefined 
                  ? item.sales_velocity.toFixed(2) 
                  : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getTrendIcon(item.trend)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.days_until_stockout !== undefined 
                  ? item.days_until_stockout === 0 
                    ? 'Out' 
                    : item.days_until_stockout > 999 
                      ? '999+' 
                      : Math.round(item.days_until_stockout)
                  : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {editingItem === item.id && updatingItem !== item.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editCost}
                      onChange={(e) => setEditCost(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border rounded"
                      min="0"
                      step="0.01"
                    />
                    <button
                      onClick={() => saveCost(item.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{formatInventoryValue(item.unit_price || 0)}</span>
                    <button
                      onClick={() => startEditingCost(item)}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={updatingItem === item.id}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.vendor || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}