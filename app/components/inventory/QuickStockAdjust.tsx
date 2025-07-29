'use client'

import { useState } from 'react'
import { Plus, Minus, Save, X } from 'lucide-react'

interface QuickStockAdjustProps {
  itemId: string
  sku: string
  currentStock: number
  onUpdate: (newStock: number) => Promise<void>
}

export default function QuickStockAdjust({ 
  itemId, 
  sku, 
  currentStock, 
  onUpdate 
}: QuickStockAdjustProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newStock, setNewStock] = useState(currentStock)
  const [isSaving, setIsSaving] = useState(false)

  const handleQuickAdjust = async (delta: number) => {
    const adjusted = Math.max(0, currentStock + delta)
    setIsSaving(true)
    try {
      await onUpdate(adjusted)
    } catch (error) {
      console.error('Failed to update stock:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (newStock === currentStock) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onUpdate(newStock)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update stock:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNewStock(currentStock)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={newStock}
          onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
          disabled={isSaving}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          title="Save"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleQuickAdjust(-1)}
        disabled={isSaving || currentStock === 0}
        className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Decrease by 1"
      >
        <Minus className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setIsEditing(true)}
        className="px-2 py-1 text-sm font-medium hover:bg-gray-50 rounded min-w-[60px]"
        disabled={isSaving}
      >
        {isSaving ? '...' : currentStock.toLocaleString()}
      </button>
      
      <button
        onClick={() => handleQuickAdjust(1)}
        disabled={isSaving}
        className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        title="Increase by 1"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}