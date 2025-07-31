'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Printer } from 'lucide-react'
import type { InventoryItem } from '@/app/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface CompactExportButtonsProps {
  items: InventoryItem[]
  filename?: string
  className?: string
}

export default function CompactExportButtons({ 
  items, 
  filename = 'inventory',
  className = ''
}: CompactExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportToCSV = () => {
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
    
    const csvContent = [
      columns.join(','),
      ...items.map(item => {
        const row = [
          item.sku || '',
          `"${(item.product_name || item.name || '').replace(/"/g, '""')}"`,
          item.current_stock || 0,
          item.reorder_point || item.minimum_stock || 0,
          item.unit_price || item.cost || 0,
          (item.current_stock || 0) * (item.unit_price || item.cost || 0),
          `"${(item.vendor || '').replace(/"/g, '""')}"`,
          `"${(item.location || '').replace(/"/g, '""')}"`,
          item.stock_status_level || '',
          item.days_until_stockout || ''
        ]
        return row.join(',')
      })
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    // Main inventory sheet
    const inventoryData = items.map(item => ({
      'SKU': item.sku || '',
      'Product Name': item.product_name || item.name || '',
      'Current Stock': item.current_stock || 0,
      'Reorder Point': item.reorder_point || item.minimum_stock || 0,
      'Unit Cost': item.unit_price || item.cost || 0,
      'Inventory Value': (item.current_stock || 0) * (item.unit_price || item.cost || 0),
      'Vendor': item.vendor || '',
      'Location': item.location || '',
      'Stock Status': item.stock_status_level || '',
      'Days Until Stockout': item.days_until_stockout || ''
    }))
    
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData)
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory')
    
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Inventory Report', 20, 30)
    
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)
    doc.text(`Total Items: ${items.length}`, 20, 55)
    
    // Table data (first 50 items to fit in PDF)
    const tableData = items.slice(0, 50).map(item => [
      item.sku || '',
      (item.product_name || item.name || '').substring(0, 30),
      item.current_stock || 0,
      item.reorder_point || item.minimum_stock || 0,
      `$${(item.unit_price || item.cost || 0).toFixed(2)}`,
      item.vendor || '',
      item.stock_status_level || ''
    ])
    
    // @ts-ignore - jsPDF autoTable types
    doc.autoTable({
      head: [['SKU', 'Product Name', 'Stock', 'Reorder', 'Price', 'Vendor', 'Status']],
      body: tableData,
      startY: 95,
      styles: { fontSize: 8 },
      columnStyles: {
        1: { cellWidth: 'auto' }
      }
    })
    
    if (items.length > 50) {
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY || 95
      doc.text(`Note: Showing first 50 of ${items.length} items`, 20, finalY + 10)
    }
    
    doc.save(`${filename}.pdf`)
  }

  const handlePrint = () => {
    // Create a print-friendly version of the inventory table
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 20px; font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .header { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Total Items: ${items.length}</p>
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
              ${items.map(item => `
                <tr>
                  <td>${item.sku || ''}</td>
                  <td>${item.product_name || item.name || ''}</td>
                  <td>${item.current_stock || 0}</td>
                  <td>${item.reorder_point || item.minimum_stock || 0}</td>
                  <td>$${(item.unit_price || item.cost || 0).toFixed(2)}</td>
                  <td>$${((item.current_stock || 0) * (item.unit_price || item.cost || 0)).toFixed(2)}</td>
                  <td>${item.vendor || ''}</td>
                  <td>${item.stock_status_level || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Generated by Inventory Management System</p>
          </div>
        </body>
      </html>
    `
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(format)
    setIsOpen(false)
    
    try {
      switch (format) {
        case 'csv':
          exportToCSV()
          break
        case 'excel':
          exportToExcel()
          break
        case 'pdf':
          exportToPDF()
          break
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      alert(`Failed to export ${format}. Please try again.`)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        title="Print inventory report"
        aria-label="Print inventory report"
      >
        <Printer className="w-4 h-4" />
      </button>

      {/* Export Dropdown */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting !== null}
          className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export inventory data"
          aria-label="Export inventory data"
          aria-haspopup="true"
          aria-expanded={isOpen ? 'true' : 'false'}
        >
          <Download className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting !== null}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting !== null}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" />
                Export Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting !== null}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" />
                Export PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isExporting && (
        <span className="text-xs text-gray-500">
          Exporting {isExporting.toUpperCase()}...
        </span>
      )}
    </div>
  )
}
