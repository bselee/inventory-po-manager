'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import type { InventoryItem } from '@/app/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ExportOption {
  format: 'csv' | 'excel' | 'pdf'
  label: string
  icon: typeof FileSpreadsheet
  description: string
}

interface ConsolidatedExportDropdownProps {
  items: InventoryItem[]
  filename?: string
  className?: string
}

const exportOptions: ExportOption[] = [
  {
    format: 'csv',
    label: 'Export CSV',
    icon: FileSpreadsheet,
    description: 'Comma-separated values file'
  },
  {
    format: 'excel',
    label: 'Export Excel',
    icon: FileSpreadsheet,
    description: 'Excel workbook with multiple sheets'
  },
  {
    format: 'pdf',
    label: 'Export PDF',
    icon: FileText,
    description: 'Professional inventory report'
  }
]

export default function ConsolidatedExportDropdown({ 
  items, 
  filename = 'inventory',
  className = ''
}: ConsolidatedExportDropdownProps) {
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
    
    // Summary sheet
    const totalValue = items.reduce((sum, item) => 
      sum + (item.current_stock || 0) * (item.unit_price || item.cost || 0), 0)
    const outOfStock = items.filter(item => (item.current_stock || 0) === 0).length
    const lowStock = items.filter(item => 
      (item.current_stock || 0) > 0 && 
      (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
    ).length
    
    const summaryData = [
      { 'Metric': 'Total Items', 'Value': items.length },
      { 'Metric': 'Total Inventory Value', 'Value': `$${totalValue.toFixed(2)}` },
      { 'Metric': 'Out of Stock Items', 'Value': outOfStock },
      { 'Metric': 'Low Stock Items', 'Value': lowStock },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ]
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    
    // Low stock alerts sheet
    const lowStockItems = items.filter(item => 
      (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
    ).map(item => ({
      'SKU': item.sku || '',
      'Product Name': item.product_name || item.name || '',
      'Current Stock': item.current_stock || 0,
      'Reorder Point': item.reorder_point || item.minimum_stock || 0,
      'Vendor': item.vendor || '',
      'Urgency': (item.current_stock || 0) === 0 ? 'Critical' : 'Low'
    }))
    
    if (lowStockItems.length > 0) {
      const alertsSheet = XLSX.utils.json_to_sheet(lowStockItems)
      XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Low Stock Alerts')
    }
    
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
    
    // Summary statistics
    const totalValue = items.reduce((sum, item) => 
      sum + (item.current_stock || 0) * (item.unit_price || item.cost || 0), 0)
    const outOfStock = items.filter(item => (item.current_stock || 0) === 0).length
    const lowStock = items.filter(item => 
      (item.current_stock || 0) > 0 && 
      (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
    ).length
    
    doc.text(`Total Value: $${totalValue.toFixed(2)}`, 20, 65)
    doc.text(`Out of Stock: ${outOfStock}`, 20, 75)
    doc.text(`Low Stock: ${lowStock}`, 20, 85)
    
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
      logError(`Error exporting ${format}:`, error)
      alert(`Failed to export ${format}. Please try again.`)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting !== null}
        className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-72 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {exportOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={isExporting !== null}
                  className="group flex items-start w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconComponent className="w-5 h-5 mr-3 mt-0.5 text-gray-400 group-hover:text-gray-500" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
