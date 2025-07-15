'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Send, FileText, Truck } from 'lucide-react'

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(false)

  // Sample PO data
  const samplePOs = [
    {
      id: '1',
      vendor: 'Widget Corp',
      vendor_email: 'orders@widgetcorp.com',
      status: 'draft',
      total_amount: 649.50,
      created_at: '2024-01-15',
      items: [
        { sku: 'WIDGET001', product_name: 'Premium Widget', quantity: 50, unit_cost: 12.99 }
      ]
    },
    {
      id: '2',
      vendor: 'Gadget Inc',
      vendor_email: 'purchasing@gadgetinc.com',
      status: 'sent',
      total_amount: 1350.00,
      created_at: '2024-01-14',
      items: [
        { sku: 'GADGET002', product_name: 'Smart Gadget', quantity: 30, unit_cost: 45.00 }
      ]
    },
    {
      id: '3',
      vendor: 'Tool Supplies',
      vendor_email: 'orders@toolsupplies.com',
      status: 'received',
      total_amount: 2699.70,
      created_at: '2024-01-10',
      items: [
        { sku: 'TOOL003', product_name: 'Professional Tool', quantity: 30, unit_cost: 89.99 }
      ]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': 
        return 'bg-gray-100 text-gray-800'
      case 'sent': 
        return 'bg-blue-100 text-blue-800'
      case 'received': 
        return 'bg-green-100 text-green-800'
      case 'cancelled': 
        return 'bg-red-100 text-red-800'
      default: 
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">
            Create, manage, and send purchase orders to vendors
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setLoading(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create from Out-of-Stock
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Manual PO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total POs</p>
              <p className="text-2xl font-bold text-gray-900">{samplePOs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">
                {samplePOs.filter(po => po.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Send className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-blue-600">
                {samplePOs.filter(po => po.status === 'sent').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Received</p>
              <p className="text-2xl font-bold text-green-600">
                {samplePOs.filter(po => po.status === 'received').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {samplePOs.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    PO-{po.id.padStart(3, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{po.vendor}</div>
                      <div className="text-gray-500">{po.vendor_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.items.length} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${po.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(po.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      View
                    </button>
                    {po.status === 'draft' && (
                      <button className="text-green-600 hover:text-green-900">
                        Send
                      </button>
                    )}
                    <button className="text-purple-600 hover:text-purple-900">
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}