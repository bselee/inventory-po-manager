'use client'

import { useState } from 'react'
import { api } from '@/app/lib/client-fetch'

export default function TestInventoryPage() {
  const [results, setResults] = useState<string[]>([])
  const [testing, setTesting] = useState(false)
  
  const addResult = (test: string, success: boolean, details: string) => {
    setResults(prev => [...prev, `${success ? '✅' : '❌'} ${test}: ${details}`])
  }
  
  const runTests = async () => {
    console.log('Running tests...')
    setTesting(true)
    setResults([])
    
    try {
      // Add initial test to check if function is running
      addResult('Test Started', true, new Date().toLocaleTimeString())
      // Test 1: Load inventory
      const { data: inventory, error: invError } = await api.get('/api/inventory')
      addResult('Load Inventory', !invError, 
        invError || `${inventory?.inventory?.length || 0} items loaded`)
      
      // Test 2: Load summary
      const { data: summary, error: sumError } = await api.get('/api/inventory/summary')
      addResult('Load Summary', !sumError, 
        sumError || `Total: ${summary?.total_items || 0}, Value: $${summary?.total_inventory_value || 0}`)
      
      // Test 3: Test filters
      const { data: filtered, error: filterError } = await api.get('/api/inventory?status=out-of-stock')
      addResult('Filter Test', !filterError, 
        filterError || `Out of stock: ${filtered?.inventory?.length || 0} items`)
      
      // Test 4: Test search
      const { data: searched, error: searchError } = await api.get('/api/inventory?search=test')
      addResult('Search Test', !searchError, 
        searchError || `Search results: ${searched?.inventory?.length || 0} items`)
      
      // Test 5: Test stock update (if items exist)
      if (inventory?.inventory?.length > 0) {
        const testItem = inventory.inventory[0]
        const { data: updated, error: updateError } = await api.put(
          `/api/inventory/${testItem.id}/stock`,
          { stock: testItem.stock + 1 }
        )
        addResult('Stock Update', !updateError, 
          updateError || `Updated ${testItem.sku} stock to ${testItem.stock + 1}`)
      }
      
    } catch (error) {
      addResult('General Error', false, error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setTesting(false)
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Inventory API Test Page</h1>
      
      <button
        onClick={runTests}
        disabled={testing}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {testing ? 'Testing...' : 'Run Tests'}
      </button>
      
      <div className="space-y-2">
        {results.map((result, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded">
            {result}
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Manual UI Tests</h2>
        <p className="mb-4">Now go to <a href="/inventory" className="text-blue-600 hover:underline">/inventory</a> and check:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Do filter buttons change the displayed items?</li>
          <li>Does search filter items as you type?</li>
          <li>Do column headers sort when clicked?</li>
          <li>Do edit icons show inline editors?</li>
          <li>Can you save changes in inline editors?</li>
          <li>Do view mode buttons (Table/Planning/Analytics) work?</li>
          <li>Does pagination work at the bottom?</li>
        </ul>
      </div>
    </div>
  )
}