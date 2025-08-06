#!/usr/bin/env node

/**
 * Test the Finale stock report URL
 */

const axios = require('axios')

const STOCK_REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406746537/Report.csv?format=csv&data=stock&attrName=%23%23stock026&rowDimensions=~lZrNA0XAzP7AwMDAAcDAms0B_sDLQHlmZmZmZmbAwMDAwMDAms0CHMDM_sDAwMDAwMCazQHUwMtAiWZmZmZmZsDAAMDAwMCazQILqVN0ZFxuUGtuZ8tAaWZmZmZmZsDAwMDAwMA&metrics=~lJrNBLiqVW5pdHNcblFvSMtAaWZmZmZmZsDAwMDAwMCazQS7rVVuaXRzXG5QYWNrZWTLQGlmZmZmZmbAwMDAwMDAms0Ev65Vbml0c1xuVHJhbnNpdMtAaWZmZmZmZsDAwMDAwMCazQTAqlVuaXRzXG5XSVDLQGlmZmZmZmbAwMDAwMDA&styles=~gqtncm91cEhlYWRlcpYIwMDAwMCkYm9keZYIwMDAwMA&filters=W1sicHJvZHVjdFN0YXR1cyIsbnVsbCxudWxsXSxbInByb2R1Y3RQcm9kdWN0VXJsIixudWxsLG51bGxdLFsicHJvZHVjdENhdGVnb3J5IixudWxsLG51bGxdLFsicHJvZHVjdE1hbnVmYWN0dXJlciIsbnVsbCxudWxsXSxbInN0b2NrTG9jYXRpb24iLFsiL2J1aWxkYXNvaWxvcmdhbmljcy9hcGkvZmFjaWxpdHkvMTAwMDUiXSxudWxsXSxbInN0b2NrRWZmZWN0aXZlRGF0ZSIsbnVsbCxudWxsXSxbInN0b2NrTWFnYXppbmUiLG51bGwsbnVsbF1d&reportTitle=Stock%20quantity%20by%20location%2C%20in%20units'

async function testStockReport() {
  // Test via our API endpoint
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: STOCK_REPORT_URL
    })
    if (response.data.analysis.sampleRows.length > 0) {
      console.log('\nSample data (first 5 rows):')
      response.data.analysis.sampleRows.slice(0, 5).forEach((row, i) => {
        Object.entries(row).forEach(([key, value]) => {
          if (value !== null && value !== '') {
          }
        })
      })
    }
  } catch (error) {
    console.error('❌ Error testing report:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Analyze URL structure
  try {
    const url = new URL(STOCK_REPORT_URL)
    // Decode filters
    const filtersParam = url.searchParams.get('filters')
    if (filtersParam) {
      const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
      const filters = JSON.parse(decodedFilters)
      filters.forEach(filter => {
        if (filter[1] !== null) {
        }
      })
    }
    
    // Decode metrics
    const metricsParam = url.searchParams.get('metrics')
    if (metricsParam) {
      console.log('- Units QoH (Quantity on Hand)')
      console.log('- Units WIP (Work in Progress)')
    }
  } catch (error) {
    console.error('Error analyzing URL:', error)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  console.log('- More detailed stock breakdown (QoH, Packed, Transit, WIP)')
}

// Run the test
testStockReport().catch(console.error)