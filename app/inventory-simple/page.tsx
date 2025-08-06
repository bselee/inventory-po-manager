'use client'

import { useEffect, useState } from 'react'

export default function SimpleInventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else if (data.data?.inventory) {
          setItems(data.data.inventory)
        } else {
          setError('No inventory data in response')
        }
      })
      .catch(err => {
        logError('Fetch error:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Loading inventory...</div>
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Inventory View</h1>
      <p className="mb-4">Found {items.length} items</p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-4 py-2">SKU</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Stock</th>
              <th className="border px-4 py-2">Cost</th>
              <th className="border px-4 py-2">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="border px-4 py-2">{item.sku}</td>
                <td className="border px-4 py-2">{item.product_name || item.name}</td>
                <td className="border px-4 py-2">{item.stock || item.current_stock || 0}</td>
                <td className="border px-4 py-2">${item.cost || 0}</td>
                <td className="border px-4 py-2">{item.vendor || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {items.length > 10 && (
        <p className="mt-4 text-gray-600">Showing first 10 of {items.length} items</p>
      )}
    </div>
  )
}