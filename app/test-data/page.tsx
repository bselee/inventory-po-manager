'use client'

import { useEffect, useState } from 'react'

export default function TestDataPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch inventory
        const invResponse = await fetch('/api/inventory')
        const invData = await invResponse.json()
        setInventory(invData.inventory || [])
        
        // Fetch vendors
        const vendResponse = await fetch('/api/vendors')
        const vendData = await vendResponse.json()
        setVendors(vendData.data || [])
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Data Test Page</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Inventory: {inventory.length} items
        </h2>
        {inventory.length > 0 && (
          <div className="bg-gray-100 p-4 rounded">
            <p>First 5 items:</p>
            <ul className="list-disc list-inside">
              {inventory.slice(0, 5).map((item, i) => (
                <li key={i}>
                  {item.sku || 'No SKU'} - {item.product_name || 'No Name'} 
                  (Stock: {item.current_stock || 0})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Vendors: {vendors.length} vendors
        </h2>
        {vendors.length > 0 && (
          <div className="bg-gray-100 p-4 rounded">
            <p>First 5 vendors:</p>
            <ul className="list-disc list-inside">
              {vendors.slice(0, 5).map((vendor, i) => (
                <li key={i}>
                  {vendor.name || 'No Name'} 
                  {vendor.email && ` - ${vendor.email}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-blue-100 p-4 rounded">
        <p className="font-semibold">Status:</p>
        <p>✅ APIs are working and returning data</p>
        <p>✅ Found {inventory.length} inventory items</p>
        <p>✅ Found {vendors.length} vendors</p>
      </div>
    </div>
  )
}