'use client'

import { useState } from 'react'
import { Package, AlertTriangle, RefreshCw, Download, TrendingDown } from 'lucide-react'

export default function InventoryPage() {
  const [loading, setLoading] = useState(false)

  // Sample data for now
  const sampleInventory = [
    {
      id: '1',
      sku: 'WIDGET001',
      product_name: 'Premium Widget',
      stock: 25,
      location: 'Warehouse A',
      reorder_point: 10,
      vendor: 'Widget Corp',
      cost: 12.99
    },
    {
      id: '2',
      sku: 'GADGET002',
      product_name: 'Smart Gadget',
      stock: 5,
      location: 'Warehouse B',
      reorder_point: 15,
      vendor: 'Gadget Inc',
      cost: 45.00
    },
    {
      id: '3',
      sku: 'TOOL003',
      product_name: 'Professional Tool',
      stock: 0,
      location: 'Warehouse A',
      reorder_point: 8,
      vendor: 'Tool Supplies',
      cost: 89.99
    }
  ]

  const stats = {
    totalItems: sampleInventory.length,
    outOfStock: sampleInventory.filter(item => item.stock === 0).length,
    lowStock: sampleInventory.filter(item => item.stock > 0 && item.stock <= item.reorder_point).length,
    totalValue: sampleInventory.reduce((sum, item) => sum + (item.stock * item.cost), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor stock levels and manage out-of-stock items
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setLoading(true)}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync Data
          </button>
          <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">$</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sampleInventory.map((item) => {
                const isOutOfStock = item.stock === 0
                const isLowStock = item.stock > 0 && item.stock <= item.reorder_point
                
                return (
                  <tr key={item.id} className={isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${
                        isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}