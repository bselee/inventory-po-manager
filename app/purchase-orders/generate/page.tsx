/**
 * Purchase Order Generation Page
 * Provides intelligent PO suggestions and manual creation
 */

'use client'

import React from 'react'
import POGenerationDashboard from '@/app/components/purchase-orders/POGenerationDashboard'
import { Toaster } from 'react-hot-toast'

export default function POGenerationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <POGenerationDashboard />
      </div>
    </div>
  )
}