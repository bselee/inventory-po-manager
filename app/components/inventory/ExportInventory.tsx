'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import type { InventoryItem } from '@/app/types'

interface ExportInventoryProps {
  items: InventoryItem[]
  filename?: string
}

export default function ExportInventory({ items, filename = 'inventory' }: ExportInventoryProps) {
  const exportToCSV = () => {
    // Define columns to export
    const columns = [
      'SKU',
      'Product Name',
      'Current Stock',
      'Reorder Point',
      'Unit Cost',
      'Inventory Value',
      'Vendor',
      'Location',
      'Stock Status',
      'Days Until Stockout'
    ]
    
    // Create CSV content
    const csvContent = [
      // Header row
      columns.join(','),
      // Data rows
      ...items.map(item => {
        const inventoryValue = (item.current_stock || 0) * (item.unit_price || item.cost || 0)
        return [
          `"${item.sku || ''}"`,
          `"${item.product_name || item.name || ''}"`,
          item.current_stock || 0,
          item.reorder_point || item.minimum_stock || 0,
          item.unit_price || item.cost || 0,
          inventoryValue.toFixed(2),
          `"${item.vendor || ''}"`,
          `"${item.location || ''}"`,
          `"${item.stock_status_level || ''}"`,
          item.days_until_stockout || ''
        ].join(',')
      })
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const exportToExcel = () => {
    // For Excel, we'll create a more detailed CSV that Excel can open
    const columns = [
      'SKU',
      'Product Name',
      'Current Stock',
      'Reorder Point',
      'Maximum Stock',
      'Unit Cost',
      'Inventory Value',
      'Vendor',
      'Location',
      'Stock Status',
      'Days Until Stockout',
      'Last Updated'
    ]
    
    const csvContent = [
      columns.join('\t'), // Tab-separated for better Excel compatibility
      ...items.map(item => {
        const inventoryValue = (item.current_stock || 0) * (item.unit_price || item.cost || 0)
        return [
          item.sku || '',
          item.product_name || item.name || '',
          item.current_stock || 0,
          item.reorder_point || item.minimum_stock || 0,
          item.maximum_stock || '',
          item.unit_price || item.cost || 0,
          inventoryValue.toFixed(2),
          item.vendor || '',
          item.location || '',
          item.stock_status_level || '',
          item.days_until_stockout || '',
          item.last_updated ? new Date(item.last_updated).toLocaleString() : ''
        ].join('\t')
      })
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportToCSV}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
        title="Export to CSV"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
      <button
        onClick={exportToExcel}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
        title="Export to Excel"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export Excel
      </button>
    </div>
  )
}