'use client'

import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function DashboardLayout({ 
  children, 
  title = 'Dashboard',
  subtitle = 'Real-time inventory and business metrics'
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {children}
        </div>
      </div>
    </div>
  )
}