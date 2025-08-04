'use client'

import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Edit2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { InventoryItem, ColumnConfig, SortConfig } from '@/app/types'

interface EnhancedInventoryTableProps {
  items: InventoryItem[]
  columns: ColumnConfig[]
  sortConfig: SortConfig
  onSort: (key: keyof InventoryItem | 'actions') => void
  onCostEdit: (itemId: string, newCost: number) => void
  editingItem: string | null
  showCostEdit: boolean
  editCost: number
  onStartCostEdit: (itemId: string, currentCost: number) => void
  onCancelCostEdit: () => void
  onToggleVisibility: (itemId: string, hidden: boolean) => void
  className?: string
}

export default function EnhancedInventoryTable({
  items,
  columns,
  sortConfig,
  onSort,
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

  const getSortIcon = (columnKey: keyof InventoryItem | 'actions') => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  const formatValue = (item: InventoryItem, columnKey: keyof InventoryItem) => {
    const value = item[columnKey]
    
    if (columnKey === 'cost' && typeof value === 'number') {
      return `$${value.toFixed(2)}`
    }
    
    if (columnKey === 'current_stock' && typeof value === 'number') {
      return value.toLocaleString()
    }
    
    if (columnKey === 'vendor') {
      if (!value) {
        return '-'
      }
      
      return (
        <button
          onClick={() => handleVendorClick(value as string)}
          className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5 inline-flex items-center gap-1 transition-colors"
          title={`View ${value} vendor details`}
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </button>
      )
    }
    
    return value || '-'
  }

  const handleVendorClick = (vendorName: string) => {
    const encodedVendor = encodeURIComponent(vendorName)
    window.open(`/vendors?vendor=${encodedVendor}`, '_blank')
  }

  const getRowClassName = (item: InventoryItem) => {
    let className = 'hover:bg-gray-50 border-b border-gray-200'
    
    if (item.hidden) {
      className += ' bg-gray-100 text-gray-500'
    }
    
    const stock = item.current_stock || 0
    const minStock = item.minimum_stock || 0
    
    if (stock === 0) {
      className += ' bg-red-50'
    } else if (stock <= minStock) {
      className += ' bg-yellow-50'
    }
    
    return className
  }

  if (items.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">No items found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className={getRowClassName(item)}>
                {visibleColumns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                    {column.key === 'actions' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleVisibility(item.id, !item.hidden)}
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            item.hidden ? 'text-gray-400' : 'text-blue-600'
                          }`}
                          title={item.hidden ? 'Show item' : 'Hide item'}
                        >
                          {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        
                        <button
                          onClick={() => onStartCostEdit(item.id, item.cost || 0)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-200 transition-colors"
                          title="Edit cost"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : column.key === 'current_stock' ? (
                      <span className="font-medium">
                        {item.current_stock?.toLocaleString() || 0}
                      </span>
                    ) : column.key === 'cost' && editingItem === item.id && showCostEdit ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editCost}
                          onChange={(e) => onCostEdit(item.id, Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="0.01"
                          autoFocus
                          aria-label={`Cost for ${item.sku}`}
                        />
                        <button
                          onClick={onCancelCostEdit}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={column.align === 'right' ? 'text-right' : ''}>
                        {formatValue(item, column.key as keyof InventoryItem)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
