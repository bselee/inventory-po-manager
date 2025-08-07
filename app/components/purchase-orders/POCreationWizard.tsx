/**
 * Multi-step wizard for creating custom purchase orders
 */

import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Search, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Vendor {
  id: string
  name: string
  contact_email?: string
}

interface InventoryItem {
  sku: string
  product_name: string
  current_stock: number
  reorder_point: number
  unit_cost: number
  vendor_name?: string
}

interface POLineItem {
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  notes?: string
}

interface POCreationWizardProps {
  onClose: () => void
  onSuccess: () => void
}

export default function POCreationWizard({ onClose, onSuccess }: POCreationWizardProps) {
  const [step, setStep] = useState(1)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [customVendor, setCustomVendor] = useState({ name: '', email: '' })
  const [lineItems, setLineItems] = useState<POLineItem[]>([])
  const [shippingCost, setShippingCost] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  
  useEffect(() => {
    fetchVendors()
    fetchInventory()
  }, [])
  
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors')
      if (response.ok) {
        const data = await response.json()
        setVendors(data.vendors || [])
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }
  
  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        setInventory(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }
  
  const addLineItem = (item?: InventoryItem) => {
    const newItem: POLineItem = item ? {
      sku: item.sku,
      product_name: item.product_name,
      quantity: Math.max(item.reorder_point - item.current_stock, 10),
      unit_cost: item.unit_cost || 0,
      notes: ''
    } : {
      sku: '',
      product_name: '',
      quantity: 1,
      unit_cost: 0,
      notes: ''
    }
    
    setLineItems([...lineItems, newItem])
  }
  
  const updateLineItem = (index: number, field: keyof POLineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }
  
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }
  
  const calculateTotal = () => {
    const itemsTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
    return itemsTotal + shippingCost + taxAmount
  }
  
  const handleSubmit = async () => {
    if (!selectedVendor && !customVendor.name) {
      toast.error('Please select or enter a vendor')
      return
    }
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }
    
    setIsLoading(true)
    try {
      const vendorData = selectedVendor || customVendor
      
      const response = await fetch('/api/purchase-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendor?.id,
          vendor_name: vendorData.name,
          vendor_email: vendorData.contact_email || vendorData.email,
          items: lineItems,
          shipping_cost: shippingCost,
          tax_amount: taxAmount,
          expected_date: expectedDate || undefined,
          notes: notes || undefined
        })
      })
      
      if (!response.ok) throw new Error('Failed to create PO')
      
      onSuccess()
    } catch (error) {
      console.error('Error creating PO:', error)
      toast.error('Failed to create purchase order')
    } finally {
      setIsLoading(false)
    }
  }
  
  const filteredInventory = inventory.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Select Vendor</h3>
            
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Existing Vendor</span>
                <select
                  value={selectedVendor?.id || ''}
                  onChange={(e) => {
                    const vendor = vendors.find(v => v.id === e.target.value)
                    setSelectedVendor(vendor || null)
                    if (vendor) setCustomVendor({ name: '', email: '' })
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.contact_email && `(${vendor.contact_email})`}
                    </option>
                  ))}
                </select>
              </label>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or create new</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Vendor Name</span>
                  <input
                    type="text"
                    value={customVendor.name}
                    onChange={(e) => {
                      setCustomVendor({ ...customVendor, name: e.target.value })
                      if (e.target.value) setSelectedVendor(null)
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="New vendor name"
                  />
                </label>
                
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Email (optional)</span>
                  <input
                    type="email"
                    value={customVendor.email}
                    onChange={(e) => setCustomVendor({ ...customVendor, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="vendor@example.com"
                  />
                </label>
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Add Line Items</h3>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search inventory by SKU or name..."
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => addLineItem()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Custom Item
              </button>
            </div>
            
            {searchTerm && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredInventory.slice(0, 10).map(item => (
                  <button
                    key={item.sku}
                    onClick={() => {
                      addLineItem(item)
                      setSearchTerm('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{item.sku}</span>
                      <span className="text-sm text-gray-600">
                        Stock: {item.current_stock} | Cost: ${item.unit_cost}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">{item.product_name}</div>
                  </button>
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Line Items ({lineItems.length})</h4>
              
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Search for items or add custom items.
                </div>
              ) : (
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="border rounded-md p-3 space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => updateLineItem(index, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="rounded-md border-gray-300 text-sm"
                        />
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => updateLineItem(index, 'product_name', e.target.value)}
                          placeholder="Product name"
                          className="rounded-md border-gray-300 text-sm col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          min="1"
                          className="rounded-md border-gray-300 text-sm"
                        />
                        <input
                          type="number"
                          value={item.unit_cost}
                          onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          placeholder="Unit cost"
                          step="0.01"
                          min="0"
                          className="rounded-md border-gray-300 text-sm"
                        />
                        <div className="text-sm font-medium flex items-center">
                          Total: ${(item.quantity * item.unit_cost).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full rounded-md border-gray-300 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Additional Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Shipping Cost</span>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </label>
              
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Tax Amount</span>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </label>
              
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Expected Delivery Date</span>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </label>
            </div>
            
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Additional notes or instructions..."
              />
            </label>
            
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="font-medium text-gray-700 mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Vendor:</span>
                  <span className="font-medium">
                    {selectedVendor?.name || customVendor.name || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span className="font-medium">{lineItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    ${lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Purchase Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex justify-between">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    s === step
                      ? 'bg-blue-600 text-white'
                      : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {s === 1 ? 'Vendor' : s === 2 ? 'Items' : 'Details'}
                </span>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-3 ${s < step ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderStep()}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedVendor && !customVendor.name) ||
                (step === 2 && lineItems.length === 0)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Creating...' : 'Create PO'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}