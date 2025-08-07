/**
 * Component for displaying a purchase order suggestion card
 */

import React, { useState } from 'react'
import { ShoppingCart, AlertTriangle, Clock, DollarSign, Package, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'

interface POLineItem {
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  current_stock: number
  reorder_point: number
  sales_velocity: number
  days_until_stockout: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

interface POSuggestion {
  vendor_id?: string
  vendor_name: string
  vendor_email?: string
  items: POLineItem[]
  total_amount: number
  total_items: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  estimated_stockout_days: number
  has_existing_draft?: boolean
  draft_count?: number
}

interface POSuggestionCardProps {
  suggestion: POSuggestion
  onCreatePO: (suggestion: POSuggestion, adjustments?: any[]) => void
  onViewDrafts?: () => void
}

export default function POSuggestionCard({ 
  suggestion, 
  onCreatePO,
  onViewDrafts 
}: POSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({})
  
  const urgencyColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  }
  
  const urgencyIcons = {
    critical: <AlertTriangle className="h-5 w-5" />,
    high: <Clock className="h-5 w-5" />,
    medium: <Package className="h-5 w-5" />,
    low: <ShoppingCart className="h-5 w-5" />
  }
  
  const handleQuantityChange = (sku: string, newQuantity: number) => {
    if (newQuantity > 0) {
      setAdjustedQuantities(prev => ({
        ...prev,
        [sku]: newQuantity
      }))
    }
  }
  
  const handleCreatePO = () => {
    const adjustments = Object.entries(adjustedQuantities).map(([sku, quantity]) => ({
      sku,
      quantity
    }))
    
    onCreatePO(suggestion, adjustments.length > 0 ? adjustments : undefined)
    setIsEditing(false)
    setAdjustedQuantities({})
  }
  
  const calculateAdjustedTotal = () => {
    return suggestion.items.reduce((total, item) => {
      const quantity = adjustedQuantities[item.sku] || item.quantity
      return total + (quantity * item.unit_cost)
    }, 0)
  }
  
  const hasAdjustments = Object.keys(adjustedQuantities).length > 0
  const adjustedTotal = hasAdjustments ? calculateAdjustedTotal() : suggestion.total_amount
  
  return (
    <div className={`border rounded-lg p-4 ${urgencyColors[suggestion.urgency_level]} bg-opacity-20`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {suggestion.vendor_name}
          </h3>
          {suggestion.vendor_email && (
            <p className="text-sm text-gray-600">{suggestion.vendor_email}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${urgencyColors[suggestion.urgency_level]}`}>
            {urgencyIcons[suggestion.urgency_level]}
            {suggestion.urgency_level.toUpperCase()}
          </span>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-600">Items</p>
          <p className="text-lg font-semibold">{suggestion.total_items}</p>
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-600">Total Cost</p>
          <p className="text-lg font-semibold">${adjustedTotal.toFixed(2)}</p>
          {hasAdjustments && (
            <p className="text-xs text-gray-500">
              (was ${suggestion.total_amount.toFixed(2)})
            </p>
          )}
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-600">Min Stockout</p>
          <p className="text-lg font-semibold">
            {suggestion.estimated_stockout_days} days
          </p>
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-600">Existing Drafts</p>
          <p className="text-lg font-semibold">
            {suggestion.draft_count || 0}
          </p>
        </div>
      </div>
      
      {/* Existing Draft Warning */}
      {suggestion.has_existing_draft && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
          <p className="text-sm text-yellow-800">
            ⚠️ There are existing draft POs for this vendor created in the last 24 hours.
            <button
              onClick={onViewDrafts}
              className="ml-2 text-yellow-900 underline hover:no-underline"
            >
              View Drafts
            </button>
          </p>
        </div>
      )}
      
      {/* Expandable Items List */}
      <div className="mt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isExpanded ? 'Hide' : 'Show'} Items ({suggestion.total_items})
        </button>
        
        {isExpanded && (
          <div className="mt-3 space-y-2">
            <div className="bg-white rounded-lg p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">SKU</th>
                    <th className="text-left pb-2">Product</th>
                    <th className="text-center pb-2">Stock</th>
                    <th className="text-center pb-2">Velocity</th>
                    <th className="text-center pb-2">Stockout</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-right pb-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestion.items.map((item) => (
                    <tr key={item.sku} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{item.sku}</td>
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2 text-center">
                        <span className={item.current_stock <= item.reorder_point ? 'text-red-600 font-semibold' : ''}>
                          {item.current_stock}
                        </span>
                        /{item.reorder_point}
                      </td>
                      <td className="py-2 text-center">{item.sales_velocity.toFixed(1)}/day</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.days_until_stockout <= 7 ? 'bg-red-100 text-red-800' :
                          item.days_until_stockout <= 14 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.days_until_stockout}d
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={adjustedQuantities[item.sku] || item.quantity}
                            onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value))}
                            className="w-20 px-2 py-1 border rounded text-center"
                          />
                        ) : (
                          <span className={adjustedQuantities[item.sku] ? 'font-semibold text-blue-600' : ''}>
                            {adjustedQuantities[item.sku] || item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        ${((adjustedQuantities[item.sku] || item.quantity) * item.unit_cost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={6} className="pt-2 text-right">Total:</td>
                    <td className="pt-2 text-right">${adjustedTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={handleCreatePO}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Create PO
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Adjust Quantities
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleCreatePO}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              Save & Create PO
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setAdjustedQuantities({})
              }}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}