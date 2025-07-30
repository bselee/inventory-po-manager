'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { AlertTriangle, Package, TrendingDown, Bell } from 'lucide-react'

interface CriticalItem {
  id: string
  sku: string
  product_name: string
  stock: number
  reorder_point: number
  vendor: string
  last_updated: string
}

export default function CriticalItemsMonitor() {
  const [criticalItems, setCriticalItems] = useState<CriticalItem[]>([])
  const [newAlerts, setNewAlerts] = useState<string[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)

  useEffect(() => {
    // Initial load
    loadCriticalItems()

    // Set up real-time subscription
    const channel = supabase
      .channel('critical-items-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: 'stock=lte.reorder_point'
        },
        (payload) => {
          console.log('Critical item change:', payload)
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const item = payload.new as any
            
            // Check if this is a new critical situation
            if (item.stock <= item.reorder_point) {
              setNewAlerts(prev => [...prev, item.sku])
              
              // Show browser notification if permitted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Critical Stock Alert!', {
                  body: `${item.product_name} (${item.sku}) is ${item.stock === 0 ? 'OUT OF STOCK' : 'low on stock'}`,
                  icon: '/favicon.ico'
                })
              }
            }
          }
          
          // Reload the list
          loadCriticalItems()
        }
      )
      .subscribe()

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadCriticalItems = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .lte('stock', 'reorder_point')
      .order('stock', { ascending: true })
      .limit(20)

    if (!error && data) {
      setCriticalItems(data)
    }
  }

  const dismissAlert = (sku: string) => {
    setNewAlerts(prev => prev.filter(s => s !== sku))
  }

  if (!isMonitoring || criticalItems.length === 0) {
    return null
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Critical Items Monitor
          {newAlerts.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full animate-pulse">
              {newAlerts.length} NEW
            </span>
          )}
        </h3>
        <button
          onClick={() => setIsMonitoring(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {criticalItems.map(item => {
          const isNew = newAlerts.includes(item.sku)
          const isOutOfStock = item.stock === 0
          
          return (
            <div
              key={item.id}
              className={`
                flex items-center justify-between p-3 rounded-md
                ${isNew ? 'bg-red-100 border-red-300 animate-pulse' : 'bg-white'}
                ${isOutOfStock ? 'border-red-500' : 'border-orange-300'}
                border
              `}
            >
              <div className="flex items-center gap-3">
                {isOutOfStock ? (
                  <Package className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {item.product_name}
                    {isNew && (
                      <Bell className="inline-block h-3 w-3 ml-2 text-red-600" />
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    SKU: {item.sku} | Vendor: {item.vendor || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-orange-600'}`}>
                  {isOutOfStock ? 'OUT OF STOCK' : `${item.stock} left`}
                </p>
                <p className="text-xs text-gray-500">
                  Reorder: {item.reorder_point}
                </p>
                {isNew && (
                  <button
                    onClick={() => dismissAlert(item.sku)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Dismiss alert
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Real-time monitoring active
        </p>
      </div>
    </div>
  )
}