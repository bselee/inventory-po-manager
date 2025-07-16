'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/app/lib/supabase'

interface SalesDataRow {
  'Product ID': string
  'Sales last 30 days': number
  'Sales last 90 days': number
  'On order units'?: number
  'Purchased/MFG'?: number
}

interface UploadResult {
  success: boolean
  processed: number
  updated: number
  errors: string[]
}

export default function SalesDataUploader() {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [preview, setPreview] = useState<SalesDataRow[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setFile(file)
    setResult(null)
    setPreview([])

    // Read and preview file
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<SalesDataRow>(worksheet)

        // Show preview of first 5 items
        setPreview(jsonData.slice(0, 5))
      } catch (error) {
        console.error('Error reading file:', error)
        setResult({
          success: false,
          processed: 0,
          updated: 0,
          errors: ['Failed to read Excel file']
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  const uploadSalesData = async () => {
    if (!file) return

    setUploading(true)
    const errors: string[] = []
    let processed = 0
    let updated = 0

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<SalesDataRow>(worksheet)

        // Process in batches
        const batchSize = 50
        for (let i = 0; i < jsonData.length; i += batchSize) {
          const batch = jsonData.slice(i, i + batchSize)
          
          for (const row of batch) {
            processed++
            
            if (!row['Product ID']) {
              errors.push(`Row ${processed}: Missing Product ID`)
              continue
            }

            const salesData = {
              sales_last_30_days: parseInt(String(row['Sales last 30 days'] || 0)),
              sales_last_90_days: parseInt(String(row['Sales last 90 days'] || 0)),
              last_sales_update: new Date().toISOString()
            }

            const { error } = await supabase
              .from('inventory_items')
              .update(salesData)
              .eq('sku', row['Product ID'])

            if (error) {
              errors.push(`SKU ${row['Product ID']}: ${error.message}`)
            } else {
              updated++
            }
          }
        }

        setResult({
          success: errors.length === 0,
          processed,
          updated,
          errors: errors.slice(0, 10) // Show first 10 errors
        })
      } catch (error) {
        console.error('Error processing file:', error)
        setResult({
          success: false,
          processed: 0,
          updated: 0,
          errors: ['Failed to process Excel file']
        })
      } finally {
        setUploading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setPreview([])
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5" />
        Sales Data Upload
      </h2>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop your Finale Excel report here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or
          </p>
          <label className="cursor-pointer">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Browse Files
            </span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleChange}
            />
          </label>
          <p className="text-xs text-gray-500 mt-4">
            Accepts .xlsx and .xls files with sales data columns
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-gray-600" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {preview.length > 0 && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Preview (first 5 items):</p>
              <div className="space-y-1 text-xs">
                {preview.map((row, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="font-mono">{row['Product ID']}</span>
                    <span>30d: {row['Sales last 30 days'] || 0}</span>
                    <span>90d: {row['Sales last 90 days'] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && (
            <button
              onClick={uploadSalesData}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Sales Data...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Update Sales Data
                </>
              )}
            </button>
          )}

          {result && (
            <div className={`p-4 rounded-lg ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Sales Data Update {result.success ? 'Complete' : 'Completed with Issues'}
                  </p>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>Processed: {result.processed} items</p>
                    <p>Updated: {result.updated} items</p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-red-700">Errors:</p>
                        <ul className="mt-1 text-xs text-red-600 space-y-1">
                          {result.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={reset}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Upload Another File
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>This will update sales data (30/90 days) for existing inventory items.</p>
        <p>Make sure your Excel file contains "Product ID" and sales columns.</p>
      </div>
    </div>
  )
}