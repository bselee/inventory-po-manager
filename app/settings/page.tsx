'use client'

import { useState } from 'react'
import { Settings as SettingsIcon, Save, TestTube, CheckCircle, XCircle } from 'lucide-react'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  
  // Sample settings state
  const [settings, setSettings] = useState({
    finale_api_key: '',
    finale_api_secret: '',
    finale_account_path: '',
    google_sheet_id: '',
    google_sheets_api_key: '',
    sendgrid_api_key: '',
    from_email: '',
    low_stock_threshold: 10,
  })

  // Sample connection status
  const [connectionStatus] = useState({
    finale: false,
    googleSheets: false,
    sendgrid: false
  })

  const handleInputChange = (field: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      alert('Settings saved successfully!')
    }, 1000)
  }

  const testConnection = async (service: string) => {
    setTesting(service)
    // Simulate connection test
    setTimeout(() => {
      setTesting(null)
      alert(`${service} connection test completed!`)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure API connections and application preferences
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Finale Inventory</h3>
              <p className="text-sm text-gray-500">Primary inventory source</p>
            </div>
            {connectionStatus.finale ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <button
            onClick={() => testConnection('finale')}
            disabled={testing === 'finale'}
            className="mt-4 w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <TestTube className={`h-4 w-4 mr-2 ${testing === 'finale' ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Google Sheets</h3>
              <p className="text-sm text-gray-500">Fallback data source</p>
            </div>
            {connectionStatus.googleSheets ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <button
            onClick={() => testConnection('googleSheets')}
            disabled={testing === 'googleSheets'}
            className="mt-4 w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <TestTube className={`h-4 w-4 mr-2 ${testing === 'googleSheets' ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">SendGrid</h3>
              <p className="text-sm text-gray-500">Email service</p>
            </div>
            {connectionStatus.sendgrid ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <button
            onClick={() => testConnection('sendgrid')}
            disabled={testing === 'sendgrid'}
            className="mt-4 w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <TestTube className={`h-4 w-4 mr-2 ${testing === 'sendgrid' ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
        </div>
      </div>

      {/* Settings Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finale Inventory Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Finale Inventory API</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.finale_api_key}
                onChange={(e) => handleInputChange('finale_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Finale API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={settings.finale_api_secret}
                onChange={(e) => handleInputChange('finale_api_secret', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Finale API secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Path Component
              </label>
              <input
                type="text"
                value={settings.finale_account_path}
                onChange={(e) => handleInputChange('finale_account_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., your-company-name"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your Finale URL: app.finaleinventory.com/[account-path]/
              </p>
            </div>
          </div>
        </div>

        {/* Google Sheets Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Google Sheets (Fallback)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets API Key
              </label>
              <input
                type="password"
                value={settings.google_sheets_api_key}
                onChange={(e) => handleInputChange('google_sheets_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Google Sheets API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheet ID
              </label>
              <input
                type="text"
                value={settings.google_sheet_id}
                onChange={(e) => handleInputChange('google_sheet_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sheet ID from Google Sheets URL"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in the URL: docs.google.com/spreadsheets/d/[SHEET_ID]/
              </p>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SendGrid API Key
              </label>
              <input
                type="password"
                value={settings.sendgrid_api_key}
                onChange={(e) => handleInputChange('sendgrid_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your SendGrid API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email Address
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your-email@company.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be a verified sender in SendGrid
              </p>
            </div>
          </div>
        </div>

        {/* Application Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={settings.low_stock_threshold}
                onChange={(e) => handleInputChange('low_stock_threshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Items with stock at or below this number will be flagged as low stock
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>Finale Inventory:</strong>
            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
              <li>Log into your Finale account</li>
              <li>Go to Settings → API Keys</li>
              <li>Create a new API key with inventory and purchase order permissions</li>
              <li>Copy the API key and secret to the fields above</li>
            </ol>
          </div>
          <div>
            <strong>Google Sheets (Optional Fallback):</strong>
            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
              <li>Go to Google Cloud Console</li>
              <li>Enable the Google Sheets API</li>
              <li>Create credentials (API key)</li>
              <li>Share your inventory spreadsheet with public read access</li>
            </ol>
          </div>
          <div>
            <strong>SendGrid Email:</strong>
            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
              <li>Sign up at sendgrid.com</li>
              <li>Go to Settings → API Keys</li>
              <li>Create a new API key with Mail Send permissions</li>
              <li>Verify your sender email address in SendGrid</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}