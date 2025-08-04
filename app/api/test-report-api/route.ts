import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { FinaleReportApiService } from '@/app/lib/finale-report-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reportUrl } = body
    
    if (!reportUrl) {
      return NextResponse.json({ 
        error: 'Missing reportUrl in request body',
        instructions: 'Please provide the report URL from Finale that includes supplier/vendor data'
      }, { status: 400 })
    }
    
    console.log('[Test Report API] Testing report URL:', reportUrl)
    
    // Get Finale config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }
    
    // Initialize report API service
    const reportApi = new FinaleReportApiService({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      accountPath: config.accountPath
    })
    
    try {
      // Fetch the report
      const rows = await reportApi.fetchReport(reportUrl, 'jsonObject')
      
      // Analyze the data structure
      const analysis = {
        totalRows: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        supplierColumns: [],
        sampleRows: rows.slice(0, 5),
        productsWithSuppliers: 0
      }
      
      // Find columns that might contain supplier data
      if (rows.length > 0) {
        const firstRow = rows[0]
        Object.keys(firstRow).forEach(column => {
          const lowerColumn = column.toLowerCase()
          if (lowerColumn.includes('supplier') || 
              lowerColumn.includes('vendor') || 
              lowerColumn.includes('manufacturer') ||
              lowerColumn.includes('source')) {
            analysis.supplierColumns.push(column)
          }
        })
        
        // Count products with supplier data
        const supplierColumns = analysis.supplierColumns
        rows.forEach(row => {
          const hasSupplier = supplierColumns.some(col => 
            row[col] && row[col] !== '' && row[col] !== null
          )
          if (hasSupplier) {
            analysis.productsWithSuppliers++
          }
        })
      }
      
      // Try to process as inventory report
      let processedProducts = []
      try {
        processedProducts = await reportApi.fetchInventoryWithSuppliers(reportUrl)
      } catch (e) {
        console.log('[Test Report API] Could not process as inventory report:', e.message)
      }
      
      return NextResponse.json({
        success: true,
        analysis,
        processedProducts: processedProducts.slice(0, 5),
        recommendation: analysis.supplierColumns.length > 0 ?
          `Found supplier columns: ${analysis.supplierColumns.join(', ')}. Update sync to use this report.` :
          'No supplier columns found. Make sure the report includes supplier/vendor information.'
      })
      
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to fetch report',
        details: error instanceof Error ? error.message : 'Unknown error',
        reportUrl: reportUrl.replace(/\/[^\/]+\/doc/, '/***/doc') // Hide account path
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('[Test Report API] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET endpoint to provide instructions
export async function GET() {
  return NextResponse.json({
    instructions: 'To test the Finale Reporting API, send a POST request with a JSON body containing reportUrl',
    example: {
      reportUrl: 'https://app.finaleinventory.com/{account}/doc/report/pivotTable/{reportId}/report.json?format=jsonObject&...'
    },
    steps: [
      '1. Create a report in Finale that includes Product ID, Product Name, and Supplier/Vendor',
      '2. Copy the report URL from the browser',
      '3. Change "pivotTableStream" to "pivotTable" in the URL',
      '4. Send the URL in a POST request to this endpoint'
    ]
  })
}