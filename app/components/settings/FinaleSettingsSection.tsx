'use client'

import { useState } from 'react'
import { TestTube, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { validateFinaleCredentials, getValidationErrorMessage } from '@/app/lib/validation/finale-credentials'
import { api } from '@/app/lib/client-fetch'

interface FinaleSettings {
  finale_api_key?: string
  finale_api_secret?: string
  finale_username?: string
  finale_password?: string
  finale_account_path?: string
  finale_inventory_report_url?: string
  finale_consumption_14day_url?: string
  finale_consumption_30day_url?: string
  finale_stock_report_url?: string
  finale_purchase_orders_url?: string
}

interface Props {
  settings: FinaleSettings
  onChange: (field: keyof FinaleSettings, value: string) => void
  validationErrors: Record<string, string>
  validationWarnings: Record<string, string>
}

export default function FinaleSettingsSection({ 
  settings, 
  onChange, 
  validationErrors, 
  validationWarnings 
}: Props) {
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({})

  const testConnection = async (service: string) => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }))
    
    try {
      const validation = validateFinaleCredentials(settings as any)
      
      if (!validation.isValid) {
        const errorMessage = getValidationErrorMessage(validation)
        logError('Validation failed:', errorMessage)
        setTestResults(prev => ({ ...prev, [service]: 'error' }))
        return
      }

      const endpointMap: Record<string, string> = {
        finale: '/api/finale-verify',
        google: '/api/test-google-sheets',
        sendgrid: '/api/test-sendgrid'
      }

      const { data, error } = await api.post(
        endpointMap[service] || '/api/finale-verify',
        { settings }
      )

      if (error) {
        logError(`Test ${service} failed:`, error)
        setTestResults(prev => ({ ...prev, [service]: 'error' }))
      } else {
        setTestResults(prev => ({ ...prev, [service]: 'success' }))
        setTimeout(() => {
          setTestResults(prev => ({ ...prev, [service]: null }))
        }, 3000)
      }
    } catch (error) {
      logError(`Test ${service} error:`, error)
      setTestResults(prev => ({ ...prev, [service]: 'error' }))
    }
  }

  const renderTestButton = (service: string) => {
    const status = testResults[service]
    
    return (
      <button
        onClick={() => testConnection(service)}
        disabled={status === 'testing'}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
          ${status === 'testing' 
            ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
            : status === 'success'
            ? 'bg-green-100 text-green-700'
            : status === 'error'
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        {status === 'testing' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
        ) : status === 'success' ? (
          <><Check className="h-4 w-4" /> Connected</>
        ) : status === 'error' ? (
          <><X className="h-4 w-4" /> Failed</>
        ) : (
          <><TestTube className="h-4 w-4" /> Test</>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Finale API Configuration</h2>
        {renderTestButton('finale')}
      </div>

      {/* Show validation warnings */}
      {Object.keys(validationWarnings).length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Configuration Warnings</h3>
              <div className="mt-2 text-sm text-yellow-700">
                {Object.entries(validationWarnings).map(([field, warning]) => (
                  <p key={field}>• {warning}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            API Key
            {validationErrors.finale_api_key && (
              <span className="text-red-500 text-xs ml-2">{validationErrors.finale_api_key}</span>
            )}
          </label>
          <input
            type="text"
            value={settings.finale_api_key || ''}
            onChange={(e) => onChange('finale_api_key', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              validationErrors.finale_api_key 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
            placeholder="Your Finale API Key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            API Secret
            {validationErrors.finale_api_secret && (
              <span className="text-red-500 text-xs ml-2">{validationErrors.finale_api_secret}</span>
            )}
          </label>
          <input
            type="password"
            value={settings.finale_api_secret || ''}
            onChange={(e) => onChange('finale_api_secret', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              validationErrors.finale_api_secret
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
            placeholder="Your Finale API Secret"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Path
            {validationErrors.finale_account_path && (
              <span className="text-red-500 text-xs ml-2">{validationErrors.finale_account_path}</span>
            )}
          </label>
          <input
            type="text"
            value={settings.finale_account_path || ''}
            onChange={(e) => onChange('finale_account_path', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              validationErrors.finale_account_path
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
            placeholder="e.g., buildasoil"
          />
          <p className="mt-1 text-xs text-gray-500">
            The account path from your Finale URL (e.g., if your URL is app.finaleinventory.com/buildasoil, enter "buildasoil")
          </p>
        </div>

        {/* Report URLs Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Report URLs (Optional)</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600">Inventory Report URL</label>
              <input
                type="url"
                value={settings.finale_inventory_report_url || ''}
                onChange={(e) => onChange('finale_inventory_report_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://app.finaleinventory.com/..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">14-Day Consumption Report URL</label>
              <input
                type="url"
                value={settings.finale_consumption_14day_url || ''}
                onChange={(e) => onChange('finale_consumption_14day_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://app.finaleinventory.com/..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">30-Day Consumption Report URL</label>
              <input
                type="url"
                value={settings.finale_consumption_30day_url || ''}
                onChange={(e) => onChange('finale_consumption_30day_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://app.finaleinventory.com/..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">Stock Report URL</label>
              <input
                type="url"
                value={settings.finale_stock_report_url || ''}
                onChange={(e) => onChange('finale_stock_report_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://app.finaleinventory.com/..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">Purchase Orders Report URL</label>
              <input
                type="url"
                value={settings.finale_purchase_orders_url || ''}
                onChange={(e) => onChange('finale_purchase_orders_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://app.finaleinventory.com/..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}