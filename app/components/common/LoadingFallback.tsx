'use client'

import { Loader2, Package, Users } from 'lucide-react'

interface LoadingFallbackProps {
  type?: 'inventory' | 'vendors' | 'general'
  message?: string
}

export default function LoadingFallback({ type = 'general', message }: LoadingFallbackProps) {
  const getLoadingContent = () => {
    switch (type) {
      case 'inventory':
        return {
          icon: <Package className="h-8 w-8 text-blue-500" />,
          title: 'Loading Inventory',
          message: message || 'Fetching inventory data and applying filters...'
        }
      case 'vendors':
        return {
          icon: <Users className="h-8 w-8 text-green-500" />,
          title: 'Loading Vendors',
          message: message || 'Loading vendor information and statistics...'
        }
      default:
        return {
          icon: <Loader2 className="h-8 w-8 text-gray-400" />,
          title: 'Loading',
          message: message || 'Loading page content...'
        }
    }
  }

  const content = getLoadingContent()

  return (
    <div className="flex items-center justify-center min-h-64 py-12">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin">
            {content.icon}
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {content.title}
        </h3>
        <p className="text-gray-600 max-w-sm">
          {content.message}
        </p>
        <div className="mt-4">
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.1s]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InventoryLoadingFallback() {
  return <LoadingFallback type="inventory" />
}

export function VendorsLoadingFallback() {
  return <LoadingFallback type="vendors" />
}
