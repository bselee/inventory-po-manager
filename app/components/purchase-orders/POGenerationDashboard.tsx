/**
 * Main dashboard component for PO generation and management
 */

'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, Plus, Filter, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import POSuggestionCard from './POSuggestionCard'
import POCreationWizard from './POCreationWizard'
import { toast } from 'react-hot-toast'

interface POSuggestion {
  vendor_id?: string
  vendor_name: string
  vendor_email?: string
  items: any[]
  total_amount: number
  total_items: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  estimated_stockout_days: number
  has_existing_draft?: boolean
  draft_count?: number
}

interface POSummary {
  critical_vendors: number
  high_priority_vendors: number
  total_items_to_order: number
  estimated_total_cost: number
}

export default function POGenerationDashboard() {
  const [suggestions, setSuggestions] = useState<POSuggestion[]>([])
  const [summary, setSummary] = useState<POSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [showWizard, setShowWizard] = useState(false)
  const [draftPOs, setDraftPOs] = useState<any[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/purchase-orders/generate')
      if (!response.ok) throw new Error('Failed to fetch suggestions')
      
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setSummary(data.summary || null)
      setLastRefresh(new Date())
      
      if (data.suggestions.length === 0) {
        toast.success('All inventory levels are adequate!')
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      toast.error('Failed to fetch PO suggestions')
    } finally {
      setIsLoading(false)
    }
  }
  
  const createPOFromSuggestion = async (suggestion: POSuggestion, adjustments?: any[]) => {
    try {
      const response = await fetch('/api/purchase-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion, adjustments })
      })
      
      if (!response.ok) throw new Error('Failed to create PO')
      
      const data = await response.json()
      toast.success(`Purchase order ${data.purchase_order.po_number} created successfully!`)
      
      // Refresh suggestions
      await fetchSuggestions()
    } catch (error) {
      console.error('Error creating PO:', error)
      toast.error('Failed to create purchase order')
    }
  }
  
  const approvePO = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via PO dashboard' })
      })
      
      if (!response.ok) throw new Error('Failed to approve PO')
      
      toast.success('Purchase order approved!')
      await fetchDraftPOs()
    } catch (error) {
      console.error('Error approving PO:', error)
      toast.error('Failed to approve purchase order')
    }
  }
  
  const rejectPO = async (poId: string, reason: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes: 'Rejected via PO dashboard' })
      })
      
      if (!response.ok) throw new Error('Failed to reject PO')
      
      toast.success('Purchase order rejected')
      await fetchDraftPOs()
    } catch (error) {
      console.error('Error rejecting PO:', error)
      toast.error('Failed to reject purchase order')
    }
  }
  
  const fetchDraftPOs = async () => {
    try {
      const response = await fetch('/api/purchase-orders?status=draft')
      if (!response.ok) throw new Error('Failed to fetch draft POs')
      
      const data = await response.json()
      setDraftPOs(data.purchaseOrders || [])
    } catch (error) {
      console.error('Error fetching draft POs:', error)
    }
  }
  
  useEffect(() => {
    fetchSuggestions()
    fetchDraftPOs()
  }, [])
  
  const filteredSuggestions = filter === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.urgency_level === filter)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Order Generation</h1>
            <p className="text-sm text-gray-600 mt-1">
              Intelligent PO suggestions based on inventory levels and sales velocity
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Custom PO
            </button>
            <button
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {lastRefresh && (
          <p className="text-xs text-gray-500">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Critical Vendors</p>
                <p className="text-2xl font-bold text-red-900">{summary.critical_vendors}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-900">{summary.high_priority_vendors}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Items to Order</p>
                <p className="text-2xl font-bold text-blue-900">{summary.total_items_to_order}</p>
              </div>
              <Plus className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Est. Total Cost</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(summary.estimated_total_cost)}
                </p>
              </div>
              <Download className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by urgency:</span>
          <div className="flex gap-2">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
                {level !== 'all' && (
                  <span className="ml-1 text-xs">
                    ({suggestions.filter(s => s.urgency_level === level).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Draft POs Section */}
      {draftPOs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Draft Purchase Orders ({draftPOs.length})
          </h3>
          <div className="space-y-2">
            {draftPOs.map((po) => (
              <div key={po.id} className="bg-white rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{po.po_number}</p>
                  <p className="text-sm text-gray-600">
                    {po.vendor_name} - {formatCurrency(po.total_amount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approvePO(po.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectPO(po.id, 'Not needed at this time')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Suggestions Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredSuggestions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSuggestions.map((suggestion, index) => (
            <POSuggestionCard
              key={`${suggestion.vendor_name}-${index}`}
              suggestion={suggestion}
              onCreatePO={createPOFromSuggestion}
              onViewDrafts={fetchDraftPOs}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">All inventory levels are adequate!</h3>
          <p className="text-sm text-gray-600 mt-1">
            No purchase orders need to be generated at this time.
          </p>
        </div>
      )}
      
      {/* Creation Wizard Modal */}
      {showWizard && (
        <POCreationWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false)
            fetchDraftPOs()
            toast.success('Custom PO created successfully!')
          }}
        />
      )}
    </div>
  )
}