'use client'

import React from 'react'
import { InventoryItem } from '@/app/types'
import { ColumnConfig, SortConfig } from '@/app/hooks/useInventoryTableManager'
import { Edit2 } from 'lucide-react'
import { 
  getStockStatusDisplay,
  formatInventoryValue 
} from '@/app/lib/inventory-calculations'

interface EnhancedInventoryTableProps {
  items: InventoryItem[]
  columns: ColumnConfig[]
  sortConfig: SortConfig
  onSort: (key: keyof InventoryItem) => void
  onStockUpdate?: (itemId: string, newStock: number) => Promise<void>
  onCostEdit?: (itemId: string, newCost: number) => Promise<void>
  editingItem?: string | null
  showCostEdit?: boolean
  editCost?: number
  onStartCostEdit?: (itemId: string, currentCost: number) => void
  onCancelCostEdit?: () => void
  onToggleVisibility?: (itemId: string, hidden: boolean) => Promise<void>
  className?: string
}

export default function EnhancedInventoryTable({
  items,
  columns,
  sortConfig,
  onSort,
  onStockUpdate,
  onCostEdit,
  editingItem,
  showCostEdit,
  editCost,
  onStartCostEdit,
  onCancelCostEdit,
  onToggleVisibility,
  className = ''
}: EnhancedInventoryTableProps) {
  const visibleColumns = columns.filter(col => col.visible)

  const formatCellValue = (column: ColumnConfig, item: InventoryItem) => {
    const value = item[column.key as keyof InventoryItem]

    if (column.format) {
      return column.format(value, item)
    }

    switch (column.type) {
      case 'currency':
        return `$${((value as number) || 0).toFixed(2)}`
      case 'number':
        if (column.key === 'sales_velocity') {
          const velocity = value as number || 0
          return isNaN(velocity) || !isFinite(velocity) ? '0.00' : velocity.toFixed(2)
        }
        if (column.key === 'days_until_stockout') {
          return value === Infinity ? '∞' : (value as number || 0)
        }
        return (value as number) || 0
      case 'date':
        if (!value) return '-'
        return new Date(value as string).toLocaleDateString()
      case 'status':
        if (column.key === 'stock_status_level') {
          const status = getStockStatusDisplay(item)
          return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              status.color === 'red' ? 'bg-red-100 text-red-800' : 
              status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 
              status.color === 'green' ? 'bg-green-100 text-green-800' : 
              status.color === 'blue' ? 'bg-blue-100 text-blue-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {status.text}
            </span>
          )
        }
        break
      case 'component':
        if (column.key === 'actions') {
          return (
            <div className="flex items-center gap-2">
              {onCostEdit && onStartCostEdit && (
                <button
                  onClick={() => onStartCostEdit(item.id, item.unit_price || item.cost || 0)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit cost"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {onToggleVisibility && (
                <button
                  onClick={() => onToggleVisibility(item.id, !item.hidden)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    item.hidden 
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={item.hidden ? 'Show item' : 'Hide item'}
                >
                  {item.hidden ? 'Show' : 'Hide'}
                </button>
              )}
            </div>
          )
        }
        break
      case 'text':
      default:
        if (column.key === 'trend') {
          const trendIcon: Record<string, string> = {
            increasing: '📈',
            decreasing: '📉', 
            stable: '➡️'
          }
          return trendIcon[value as string] || '➡️'
        }
        return value || '-'
    }

    return value || '-'
  }

  const renderCell = (column: ColumnConfig, item: InventoryItem) => {
    // Special handling for editable cells
    if (column.key === 'current_stock') {
      // Make stock column read-only - just display the number
      return (
        <span className="font-mono text-sm">
          {(item.current_stock || 0).toLocaleString()}
        </span>
      )
    }

    if (column.key === 'unit_price' && editingItem === item.id && showCostEdit) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={editCost}
            onChange={(e) => {/* This would need to be handled by parent */}}
            className="w-20 px-2 py-1 border border-gray-300 rounded"
            step="0.01"
            autoFocus
            aria-label="Edit cost"
          />
          <button
            onClick={() => onCostEdit && onCostEdit(item.id, editCost || 0)}
            className="text-green-600 hover:text-green-800"
            aria-label="Save cost update"
          >
            ✓
          </button>
          <button
            onClick={onCancelCostEdit}
            className="text-red-600 hover:text-red-800"
            aria-label="Cancel cost edit"
          >
            ✗
          </button>
        </div>
      )
    }

    if (column.key === 'unit_price' && onStartCostEdit && editingItem !== item.id) {
      return (
        <div className="flex items-center gap-2">
          {formatCellValue(column, item)}
          <button
            onClick={() => onStartCostEdit(item.id, item.unit_price || item.cost || 0)}
            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit cost"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      )
    }

    // Handle special status cell with reorder badge
    if (column.key === 'stock_status_level') {
      const status = getStockStatusDisplay(item)
      return (
        <div>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            status.color === 'red' ? 'bg-red-100 text-red-800' : 
            status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 
            status.color === 'green' ? 'bg-green-100 text-green-800' : 
            status.color === 'blue' ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {status.text}
          </span>
          {item.reorder_recommended && (
            <div className="mt-1">
              <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                Reorder Now
              </span>
            </div>
          )}
        </div>
      )
    }

    // Handle sales velocity with color coding
    if (column.key === 'sales_velocity') {
      const velocity = item.sales_velocity || 0
      return (
        <span className={`font-medium ${
          velocity > 1 ? 'text-green-600' : 
          velocity > 0.1 ? 'text-yellow-600' : 
          velocity > 0 ? 'text-orange-600' : 'text-red-600'
        }`}>
          {isNaN(velocity) || !isFinite(velocity) ? '0.00' : velocity.toFixed(2)}
        </span>
      )
    }

    // Handle days until stockout with color coding
    if (column.key === 'days_until_stockout') {
      const daysLeft = item.days_until_stockout === Infinity ? '∞' : item.days_until_stockout
      return (
        <span className={`font-medium ${
          typeof daysLeft === 'number' && daysLeft <= 7 ? 'text-red-600' : 
          typeof daysLeft === 'number' && daysLeft <= 30 ? 'text-yellow-600' : 
          'text-gray-500'
        }`}>
          {daysLeft}
        </span>
      )
    }

    // Handle inventory value calculation
    if (column.key === 'inventory_value') {
      const stock = item.current_stock || 0
      const price = item.unit_price || item.cost || 0
      const value = stock * price
      return (
        <span className="font-medium text-gray-900">
          ${value.toFixed(2)}
        </span>
      )
    }

    return formatCellValue(column, item)
  }

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="inventory-table">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && onSort(column.key as keyof InventoryItem)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortConfig.key === column.key && (
                      <span className="text-blue-600 font-bold text-lg ml-1">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                    {column.sortable && sortConfig.key !== column.key && (
                      <span className="text-gray-400 text-xs ml-1">▲▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  className="px-6 py-12 text-center text-gray-500"
                  data-testid="empty-inventory"
                >
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-4">📦</div>
                    <div className="text-lg font-medium mb-2">No inventory items found</div>
                    <div className="text-sm">Try adjusting your filters or search criteria</div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 group">
                  {visibleColumns.map((column) => (
                    <td 
                      key={column.key} 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {renderCell(column, item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
