'use client'

import { useState } from 'react'

export default function SimpleTestPage() {
  const [results, setResults] = useState<string[]>([])
  const [testing, setTesting] = useState(false)
  
  const addResult = (message: string) => {
    setResults(prev => [...prev, message])
    console.log(message)
  }
  
  const runTests = async () => {
    console.log('Button clicked!')
    setTesting(true)
    setResults([])
    
    try {
      addResult('Starting tests...')
      
      // Test 1: Basic fetch
      addResult('Testing basic fetch...')
      const response = await fetch('/api/inventory')
      const data = await response.json()
      addResult(`Fetch status: ${response.status}`)
      addResult(`Items: ${data?.data?.inventory?.length || 0}`)
      
      // Test 2: With error handling
      try {
        const response2 = await fetch('/api/inventory/summary')
        const data2 = await response2.json()
        addResult(`Summary: ${data2?.data?.total_items || 0} total items`)
      } catch (e) {
        addResult(`Summary error: ${e instanceof Error ? e.message : 'Unknown'}`)
      }
      
      addResult('Tests complete!')
    } catch (error) {
      addResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Inventory Test</h1>
      
      <div className="mb-4">
        <button
          onClick={() => {
            console.log('onClick triggered')
            runTests()
          }}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {testing ? 'Testing...' : 'Run Tests'}
        </button>
        
        <button
          onClick={() => {
            console.log('Test console log')
            alert('Button works!')
          }}
          className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Alert
        </button>
      </div>
      
      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="text-gray-500">Click 'Run Tests' to start</p>
        ) : (
          results.map((result, i) => (
            <div key={i} className="p-2 bg-gray-100 rounded font-mono text-sm">
              {result}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <p className="font-semibold">Debug Info:</p>
        <p>Check browser console (F12) for logs</p>
        <p>Testing state: {testing ? 'true' : 'false'}</p>
        <p>Results count: {results.length}</p>
      </div>
    </div>
  )
}