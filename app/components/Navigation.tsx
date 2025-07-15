'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, Settings } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
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
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}