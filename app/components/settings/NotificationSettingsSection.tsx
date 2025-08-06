'use client'

import { useState } from 'react'
import { TestTube, Check, X, Loader2, Mail } from 'lucide-react'
import { api } from '@/app/lib/client-fetch'

interface NotificationSettings {
  sendgrid_api_key?: string
  sendgrid_from_email?: string
  alert_email?: string
  low_stock_threshold: number
}

interface Props {
  settings: NotificationSettings
  onChange: (field: keyof NotificationSettings, value: any) => void
}

export default function NotificationSettingsSection({ settings, onChange }: Props) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const testEmailConnection = async () => {
    setTestStatus('testing')
    setTestMessage('')

    try {
      const { data, error } = await api.post('/api/test-sendgrid', {
        apiKey: settings.sendgrid_api_key,
        fromEmail: settings.sendgrid_from_email,
        toEmail: settings.alert_email
      })

      if (error) {
        setTestStatus('error')
        setTestMessage(error || 'Failed to test email connection')
      } else {
        setTestStatus('success')
        setTestMessage('Email test successful! Check your inbox.')
        setTimeout(() => {
          setTestStatus('idle')
          setTestMessage('')
        }, 5000)
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Email & Notifications</h2>
        </div>
        {settings.sendgrid_api_key && (
          <button
            onClick={testEmailConnection}
            disabled={testStatus === 'testing'}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
              ${testStatus === 'testing' 
                ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
                : testStatus === 'success'
                ? 'bg-green-100 text-green-700'
                : testStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {testStatus === 'testing' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
            ) : testStatus === 'success' ? (
              <><Check className="h-4 w-4" /> Sent</>
            ) : testStatus === 'error' ? (
              <><X className="h-4 w-4" /> Failed</>
            ) : (
              <><TestTube className="h-4 w-4" /> Test Email</>
            )}
          </button>
        )}
      </div>

      {testMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          testStatus === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {testMessage}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            SendGrid API Key
          </label>
          <input
            type="password"
            value={settings.sendgrid_api_key || ''}
            onChange={(e) => onChange('sendgrid_api_key', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="SG.xxxxx..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Required for email notifications. Get your API key from SendGrid dashboard.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            From Email Address
          </label>
          <input
            type="email"
            value={settings.sendgrid_from_email || ''}
            onChange={(e) => onChange('sendgrid_from_email', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="notifications@yourdomain.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must be a verified sender in SendGrid
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Alert Email Address
          </label>
          <input
            type="email"
            value={settings.alert_email || ''}
            onChange={(e) => onChange('alert_email', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="alerts@yourdomain.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Where to send low stock and sync failure alerts
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Low Stock Alert Threshold
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={settings.low_stock_threshold || 10}
              onChange={(e) => onChange('low_stock_threshold', parseInt(e.target.value) || 0)}
              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <span className="text-sm text-gray-500">days of stock remaining</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Send alerts when items have less than this many days of stock
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Preferences</h3>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Low stock alerts</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Sync failure notifications</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={true}
                onChange={() => {}}
              />
              <span className="ml-2 text-sm text-gray-600">Daily summary reports</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}