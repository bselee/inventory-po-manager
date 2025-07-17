'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Mail, Phone, MapPin, FileText, Search, RefreshCw, Loader2, Edit2, Plus } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  finale_vendor_id?: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  last_updated: string
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingVendor, setEditingVendor] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Vendor>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setVendors(data || [])
    } catch (error) {
      console.error('Error loading vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadVendors()
    setRefreshing(false)
  }

  const startEditing = (vendor: Vendor) => {
    setEditingVendor(vendor.id)
    setEditForm({
      contact_name: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      notes: vendor.notes
    })
  }

  const handleUpdate = async (vendorId: string) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          ...editForm,
          last_updated: new Date().toISOString()
        })
        .eq('id', vendorId)

      if (error) throw error

      // Update local state
      setVendors(vendors.map(vendor => 
        vendor.id === vendorId 
          ? { ...vendor, ...editForm, last_updated: new Date().toISOString() }
          : vendor
      ))
      setEditingVendor(null)
    } catch (error) {
      console.error('Error updating vendor:', error)
    }
  }

  const handleAdd = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          ...newVendor,
          last_updated: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setVendors([...vendors, data])
        setShowAddModal(false)
        setNewVendor({
          name: '',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Error adding vendor:', error)
    }
  }

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_name && vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors by name, contact, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-lg">{vendor.name}</h3>
                  {vendor.finale_vendor_id && (
                    <p className="text-xs text-gray-500">ID: {vendor.finale_vendor_id}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => startEditing(vendor)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            {editingVendor === vendor.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={editForm.contact_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <textarea
                  placeholder="Address"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
                <textarea
                  placeholder="Notes"
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(vendor.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingVendor(null)}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {vendor.contact_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Contact:</span> {vendor.contact_name}
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                      {vendor.email}
                    </a>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">
                      {vendor.phone}
                    </a>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-line">{vendor.address}</span>
                  </div>
                )}
                {vendor.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-line">{vendor.notes}</span>
                  </div>
                )}
                <div className="pt-2 text-xs text-gray-500">
                  Last updated: {new Date(vendor.last_updated).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {searchTerm ? 'No vendors found matching your search.' : 'No vendors found. Run vendor sync to import from Finale.'}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add New Vendor</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Vendor Name *"
                value={newVendor.name || ''}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Contact Name"
                value={newVendor.contact_name || ''}
                onChange={(e) => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="email"
                placeholder="Email"
                value={newVendor.email || ''}
                onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newVendor.phone || ''}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <textarea
                placeholder="Address"
                value={newVendor.address || ''}
                onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
              <textarea
                placeholder="Notes"
                value={newVendor.notes || ''}
                onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAdd}
                disabled={!newVendor.name}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Add Vendor
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewVendor({
                    name: '',
                    contact_name: '',
                    email: '',
                    phone: '',
                    address: '',
                    notes: ''
                  })
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}