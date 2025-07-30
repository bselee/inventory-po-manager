'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
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
  
  const exportToPDF = () => {
    // Create a simple HTML table for PDF export
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Inventory Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f3f4f6; border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { margin-bottom: 20px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          .low-stock { color: #dc2626; font-weight: bold; }
          .out-of-stock { color: #991b1b; font-weight: bold; }
          .footer { margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
        <div class="summary">
          <div class="summary-item"><strong>Total Items:</strong> ${items.length}</div>
          <div class="summary-item"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</div>
          <div class="summary-item"><strong>Total Value:</strong> $${items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_price || item.cost || 0)), 0).toFixed(2)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Stock</th>
              <th>Reorder Point</th>
              <th>Unit Cost</th>
              <th>Value</th>
              <th>Vendor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const value = (item.current_stock || 0) * (item.unit_price || item.cost || 0)
              const stockClass = item.current_stock === 0 ? 'out-of-stock' : (item.current_stock <= (item.reorder_point ?? 0) ? 'low-stock' : '')
              return `
                <tr>
                  <td>${item.sku || ''}</td>
                  <td>${item.product_name || item.name || ''}</td>
                  <td class="${stockClass}">${item.current_stock || 0}</td>
                  <td>${item.reorder_point || 0}</td>
                  <td>$${(item.unit_price || item.cost || 0).toFixed(2)}</td>
                  <td>$${value.toFixed(2)}</td>
                  <td>${item.vendor || ''}</td>
                  <td>${item.stock_status_level || ''}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated by Inventory Management System on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `
    
    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
    }
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
      <button
        onClick={exportToPDF}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
        title="Export to PDF"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </button>
    </div>
  )
}