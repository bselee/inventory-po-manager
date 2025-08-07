'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, Send, Pause, Play, Trash2, Mail } from 'lucide-react'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
}

export default function EmailQueueManager() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testSubject, setTestSubject] = useState('Test Email from Inventory System')
  const [selectedAlertType, setSelectedAlertType] = useState('out-of-stock')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email-queue')
      if (!response.ok) throw new Error('Failed to fetch queue stats')
      const data = await response.json()
      setStats(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    }
  }

  const performAction = async (action: string, data?: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/email-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }
      
      const result = await response.json()
      alert(result.message)
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter an email address')
      return
    }
    
    setSending(true)
    await performAction('send-test', {
      to: testEmail,
      subject: testSubject,
      htmlContent: `
        <h2>Test Email</h2>
        <p>This is a test email from the inventory management system.</p>
        <p>If you received this, the email queue is working correctly!</p>
        <hr>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      `
    })
    setSending(false)
  }

  const sendTestAlert = async () => {
    setSending(true)
    await performAction('send-alert', {
      type: selectedAlertType,
      count: 3,
      items: [
        {
          productSku: 'TEST-001',
          productName: 'Test Product 1',
          quantityOnHand: 0,
          reorderPoint: 10,
          reorderQuantity: 50,
          primarySupplierName: 'Test Supplier A'
        },
        {
          productSku: 'TEST-002',
          productName: 'Test Product 2',
          quantityOnHand: 5,
          reorderPoint: 20,
          reorderQuantity: 100,
          primarySupplierName: 'Test Supplier B'
        },
        {
          productSku: 'TEST-003',
          productName: 'Test Product 3',
          quantityOnHand: 2,
          reorderPoint: 15,
          reorderQuantity: 75,
          primarySupplierName: 'Test Supplier C'
        }
      ]
    })
    setSending(false)
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2">Loading queue stats...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Queue Manager
          </h2>
          <button
            onClick={fetchStats}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Queue Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{stats.waiting}</div>
            <div className="text-xs text-gray-500">Waiting</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">{stats.delayed}</div>
            <div className="text-xs text-gray-500">Delayed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Pending</div>
          </div>
        </div>

        {/* Queue Actions */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Queue Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => performAction('retry-failed')}
              disabled={loading || stats.failed === 0}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry Failed ({stats.failed})
            </button>
            <button
              onClick={() => performAction('clear-failed')}
              disabled={loading || stats.failed === 0}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Failed
            </button>
            <button
              onClick={() => performAction('pause')}
              disabled={loading}
              className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause Queue
            </button>
            <button
              onClick={() => performAction('resume')}
              disabled={loading}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Resume Queue
            </button>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="border-t mt-6 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Send Test Email</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendTestEmail}
                disabled={sending || !testEmail}
                className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="h-4 w-4 mr-1" />
                Send Test
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedAlertType}
                onChange={(e) => setSelectedAlertType(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="out-of-stock">Out of Stock Alert</option>
                <option value="reorder-needed">Reorder Needed Alert</option>
                <option value="failure">Sync Failure Alert</option>
                <option value="stuck">Stuck Sync Alert</option>
                <option value="warning">Warning Alert</option>
              </select>
              <button
                onClick={sendTestAlert}
                disabled={sending}
                className="px-4 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Send Test Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}