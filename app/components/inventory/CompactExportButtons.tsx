'use client'

import React from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { InventoryItem } from '@/app/types'

interface CompactExportButtonsProps {
  items: InventoryItem[]
  className?: string
}

export default function CompactExportButtons({
  items,
  className = ''
}: CompactExportButtonsProps) {
  const exportToCsv = () => {
    if (items.length === 0) return

    const headers = ['SKU', 'Product Name', 'Stock', 'Cost', 'Vendor', 'Location']
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        item.sku || '',
        `"${(item.product_name || item.name || '').replace(/"/g, '""')}"`,
        item.current_stock || 0,
        item.cost || 0,
        `"${(item.vendor || '').replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToJson = () => {
    if (items.length === 0) return

    const jsonContent = JSON.stringify(items, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={exportToCsv}
        disabled={items.length === 0}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Export to CSV"
      >
        <FileSpreadsheet className="h-4 w-4" />
        CSV
      </button>
      
      <button
        onClick={exportToJson}
        disabled={items.length === 0}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Export to JSON"
      >
        <FileText className="h-4 w-4" />
        JSON
      </button>
    </div>
  )
}
