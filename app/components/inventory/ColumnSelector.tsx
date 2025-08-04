'use client'

import React, { useState } from 'react'
import { Settings, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { ColumnConfig } from '@/app/types'
import { InventoryItem } from '@/app/types'

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  onToggleColumn: (columnKey: keyof InventoryItem | 'actions') => void
  onReorderColumns: (dragIndex: number, hoverIndex: number) => void
  onResetColumns: () => void
}

export default function ColumnSelector({
  columns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Settings className="h-4 w-4" />
        Columns
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Manage Columns</h4>
                <button
                  onClick={onResetColumns}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>
            
            <div className="p-2 max-h-64 overflow-y-auto">
              {columns.map((column) => (
                <div 
                  key={column.key}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                >
                  <button
                    onClick={() => onToggleColumn(column.key)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {column.visible ? (
                      <Eye className="h-4 w-4 text-blue-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={`text-sm ${column.visible ? 'text-gray-900' : 'text-gray-500'}`}>
                      {column.label}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
