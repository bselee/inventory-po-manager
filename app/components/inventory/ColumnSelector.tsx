'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Settings, Eye, EyeOff, RotateCcw, GripVertical, ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { ColumnConfig } from '@/app/types'
import { InventoryItem } from '@/app/types'

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  onToggleColumn: (columnKey: keyof InventoryItem | 'actions') => void
  onReorderColumns: (dragIndex: number, hoverIndex: number) => void
  onResetColumns: () => void
  onApplyColumnPreset?: (presetKey: string) => void
  columnPresets?: Record<string, { name: string; description: string; columns: string[] }>
}

interface DragItem {
  index: number
  id: string
  type: string
}

export default function ColumnSelector({
  columns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  onApplyColumnPreset,
  columnPresets
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'columns' | 'presets'>('columns')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragCounterRef = useRef(0)

  const visibleCount = columns.filter(col => col.visible).length
  const totalCount = columns.length

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    dragCounterRef.current = 0
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounterRef.current++
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setDragOverIndex(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderColumns(draggedIndex, dropIndex)
    }
    handleDragEnd()
  }, [draggedIndex, onReorderColumns, handleDragEnd])

  const handleToggleAll = useCallback(() => {
    const allVisible = columns.every(col => col.visible)
    columns.forEach(col => {
      if (allVisible && col.key !== 'actions') {
        // Keep actions column visible, hide others
        if (!col.visible) onToggleColumn(col.key)
      } else if (!allVisible && !col.visible) {
        // Show all hidden columns
        onToggleColumn(col.key)
      }
    })
  }, [columns, onToggleColumn])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Columns</span>
        <span className="text-xs text-gray-500">({visibleCount}/{totalCount})</span>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Manage Columns</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleAll}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {columns.every(col => col.visible) ? 'Hide All' : 'Show All'}
                  </button>
                  <button
                    onClick={onResetColumns}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 -mb-3">
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`px-3 py-1 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'columns'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Settings className="h-3 w-3 inline mr-1" />
                  Columns
                </button>
                {columnPresets && onApplyColumnPreset && (
                  <button
                    onClick={() => setActiveTab('presets')}
                    className={`px-3 py-1 text-sm font-medium border-b-2 -mb-px ${
                      activeTab === 'presets'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Layers className="h-3 w-3 inline mr-1" />
                    Presets
                  </button>
                )}
              </div>
            </div>
            
            {activeTab === 'columns' && (
              <>
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                  Drag to reorder • Click eye to show/hide
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  <div className="space-y-1">
                    {columns.map((column, index) => (
                      <div
                        key={column.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`
                          flex items-center gap-2 p-2 rounded-md cursor-move transition-all
                          ${draggedIndex === index ? 'opacity-50' : ''}
                          ${dragOverIndex === index && draggedIndex !== index 
                            ? 'bg-blue-50 border-2 border-blue-200 border-dashed' 
                            : 'hover:bg-gray-50 border-2 border-transparent'
                          }
                        `}
                      >
                        {/* Drag Handle */}
                        <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        
                        {/* Visibility Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleColumn(column.key)
                          }}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          {column.visible ? (
                            <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm truncate ${
                            column.visible ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {column.label}
                          </span>
                        </button>

                        {/* Column Info */}
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {column.sortable && (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                              Sort
                            </span>
                          )}
                          {column.width && (
                            <span className="text-gray-400">
                              {column.width}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'presets' && columnPresets && onApplyColumnPreset && (
              <>
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                  Quick column layouts for different use cases
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    {Object.entries(columnPresets).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => {
                          onApplyColumnPreset(key)
                          setIsOpen(false)
                        }}
                        className="w-full text-left p-3 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {preset.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {preset.columns?.length} columns
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer with summary */}
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>{visibleCount} of {totalCount} columns visible</span>
                <span className="text-gray-400">
                  {activeTab === 'columns' ? 'Drag to reorder' : 'Click to apply preset'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
