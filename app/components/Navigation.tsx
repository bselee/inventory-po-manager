'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, Settings, Building2, LayoutDashboard } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Executive overview and real-time metrics',
      highlight: true
    },
    {
      href: '/inventory',
      label: 'Inventory',
      icon: Package,
      description: 'View stock levels and out-of-stock items'
    },
    {
      href: '/purchase-orders',
      label: 'Purchase Orders',
      icon: ShoppingCart,
      description: 'Manage and create purchase orders'
    },
    {
      href: '/purchase-orders/generate',
      label: 'PO Generation',
      icon: ShoppingCart,
      description: 'Intelligent PO suggestions',
      highlight: true
    },
    {
      href: '/vendors',
      label: 'Vendors',
      icon: Building2,
      description: 'Manage vendor information'
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configure API connections and preferences'
    }
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Inventory & PO Manager
            </h1>
          </div>

          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="h-1 w-1 bg-blue-500 rounded-full ml-1"></div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
        
        {/* Page context bar */}
        <div className="border-t bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Current Page:</span>
              <span className="font-medium text-gray-900">
                {navItems.find(item => item.href === pathname)?.label || 'Home'}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {navItems.find(item => item.href === pathname)?.description || 'Dashboard'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}