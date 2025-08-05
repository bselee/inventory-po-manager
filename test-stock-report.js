#!/usr/bin/env node

/**
 * Test the Finale stock report URL
 */

const axios = require('axios')

const STOCK_REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406746537/Report.csv?format=csv&data=stock&attrName=%23%23stock026&rowDimensions=~lZrNA0XAzP7AwMDAAcDAms0B_sDLQHlmZmZmZmbAwMDAwMDAms0CHMDM_sDAwMDAwMCazQHUwMtAiWZmZmZmZsDAAMDAwMCazQILqVN0ZFxuUGtuZ8tAaWZmZmZmZsDAwMDAwMA&metrics=~lJrNBLiqVW5pdHNcblFvSMtAaWZmZmZmZsDAwMDAwMCazQS7rVVuaXRzXG5QYWNrZWTLQGlmZmZmZmbAwMDAwMDAms0Ev65Vbml0c1xuVHJhbnNpdMtAaWZmZmZmZsDAwMDAwMCazQTAqlVuaXRzXG5XSVDLQGlmZmZmZmbAwMDAwMDA&styles=~gqtncm91cEhlYWRlcpYIwMDAwMCkYm9keZYIwMDAwMA&filters=W1sicHJvZHVjdFN0YXR1cyIsbnVsbCxudWxsXSxbInByb2R1Y3RQcm9kdWN0VXJsIixudWxsLG51bGxdLFsicHJvZHVjdENhdGVnb3J5IixudWxsLG51bGxdLFsicHJvZHVjdE1hbnVmYWN0dXJlciIsbnVsbCxudWxsXSxbInN0b2NrTG9jYXRpb24iLFsiL2J1aWxkYXNvaWxvcmdhbmljcy9hcGkvZmFjaWxpdHkvMTAwMDUiXSxudWxsXSxbInN0b2NrRWZmZWN0aXZlRGF0ZSIsbnVsbCxudWxsXSxbInN0b2NrTWFnYXppbmUiLG51bGwsbnVsbF1d&reportTitle=Stock%20quantity%20by%20location%2C%20in%20units'

async function testStockReport() {
  console.log('🧪 Testing Finale Stock Report URL\n')
  
  // Test via our API endpoint
  console.log('1️⃣ Testing via API endpoint...')
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: STOCK_REPORT_URL
    })
    
    console.log('✅ Report test successful!')
    console.log('\nAnalysis:')
    console.log(`- Total rows: ${response.data.analysis.totalRows}`)
    console.log(`- Columns found: ${response.data.analysis.columns.join(', ')}`)
    console.log(`- Supplier columns: ${response.data.analysis.supplierColumns.join(', ') || 'None found'}`)
    console.log(`- Products with suppliers: ${response.data.analysis.productsWithSuppliers}`)
    
    if (response.data.analysis.sampleRows.length > 0) {
      console.log('\nSample data (first 5 rows):')
      response.data.analysis.sampleRows.slice(0, 5).forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`)
        Object.entries(row).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            console.log(`  ${key}: ${value}`)
          }
        })
      })
    }
    
    console.log('\n' + response.data.recommendation)
    
  } catch (error) {
    console.error('❌ Error testing report:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Analyze URL structure
  console.log('2️⃣ Analyzing URL structure...')
  try {
    const url = new URL(STOCK_REPORT_URL)
    console.log('URL Components:')
    console.log(`- Account: buildasoilorganics`)
    console.log(`- Report ID: 1754406746537`)
    console.log(`- Format: ${url.searchParams.get('format')}`)
    console.log(`- Data type: ${url.searchParams.get('data')} (stock)`)
    console.log(`- Report title: ${decodeURIComponent(url.searchParams.get('reportTitle'))}`)
    
    // Decode filters
    const filtersParam = url.searchParams.get('filters')
    if (filtersParam) {
      const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
      const filters = JSON.parse(decodedFilters)
      console.log('\nReport Filters:')
      filters.forEach(filter => {
        if (filter[1] !== null) {
          console.log(`- ${filter[0]}: ${JSON.stringify(filter[1])}`)
        }
      })
    }
    
    // Decode metrics
    const metricsParam = url.searchParams.get('metrics')
    if (metricsParam) {
      console.log('\nMetrics included:')
      console.log('- Units QoH (Quantity on Hand)')
      console.log('- Units Packed')
      console.log('- Units Transit')
      console.log('- Units WIP (Work in Progress)')
    }
    
    console.log('\n📝 Notes:')
    console.log('- This is a stock quantity report by location')
    console.log('- Shows inventory levels across different statuses')
    console.log('- Filtered for specific location: /buildasoilorganics/api/facility/10005')
    console.log('- Includes vendor/supplier information')
    console.log('- Shows real-time stock positions including WIP and transit')
    console.log('- Could be useful for warehouse management and fulfillment')
    
  } catch (error) {
    console.error('Error analyzing URL:', error)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  console.log('3️⃣ Stock Report Benefits:')
  console.log('- More detailed stock breakdown (QoH, Packed, Transit, WIP)')
  console.log('- Location-specific inventory data')
  console.log('- Real-time stock positions')
  console.log('- Useful for fulfillment and warehouse operations')
  console.log('- Can track inventory in different stages')
}

// Run the test
testStockReport().catch(console.error)