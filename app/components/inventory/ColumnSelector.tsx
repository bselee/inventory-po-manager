'use client'

import React, { useState } from 'react'
import { Settings, Eye, EyeOff, RotateCcw, GripVertical } from 'lucide-react'
import { ColumnConfig } from '@/app/hooks/useInventoryTableManager'
import { InventoryItem } from '@/app/types'

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  onToggleColumn: (columnKey: keyof InventoryItem | 'actions') => void
  onReorderColumns: (startIndex: number, endIndex: number) => void
  onResetColumns: () => void
  className?: string
}

export default function ColumnSelector({
  columns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  className = ''
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const visibleColumns = columns.filter(col => col.visible)
  const hiddenColumns = columns.filter(col => !col.visible)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderColumns(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  const handleToggle = (columnKey: keyof InventoryItem | 'actions') => {
    onToggleColumn(columnKey)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${className}`}
        title="Customize columns"
      >
        <Settings className="h-4 w-4" />
        Columns ({visibleColumns.length})
      </button>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-80 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Customize Columns</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onResetColumns}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Reset to default"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Drag to reorder • Click to show/hide
          </p>
        </div>

        {/* Visible Columns */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-3">
            Visible Columns ({visibleColumns.length})
          </h4>
          <div className="space-y-2">
            {columns.map((column, index) => (
              column.visible && (
                <div
                  key={column.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-2 rounded-md border transition-all cursor-move ${
                    draggedIndex === index 
                      ? 'bg-blue-50 border-blue-200 opacity-50' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {column.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {column.type} • {column.width || 'auto'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(column.key)}
                    className="p-1 text-green-600 hover:text-green-800 transition-colors"
                    title="Hide column"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Hidden Columns */}
        {hiddenColumns.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-3">
              Hidden Columns ({hiddenColumns.length})
            </h4>
            <div className="space-y-2">
              {hiddenColumns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-center gap-3 p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="w-4 h-4 flex-shrink-0" /> {/* Spacer for grip icon */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {column.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {column.type} • {column.width || 'auto'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(column.key)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Show column"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total: {columns.length} columns</span>
            <span>Showing: {visibleColumns.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
