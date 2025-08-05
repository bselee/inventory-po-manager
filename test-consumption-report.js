#!/usr/bin/env node

/**
 * Test the Finale consumption report URL
 */

const axios = require('axios')

const CONSUMPTION_REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406178416/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLUI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMTQsImxlbmd0aCI6MTQsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID'

async function testConsumptionReport() {
  console.log('🧪 Testing Finale Consumption Report URL\n')
  
  // Test via our API endpoint
  console.log('1️⃣ Testing via API endpoint...')
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: CONSUMPTION_REPORT_URL
    })
    
    console.log('✅ Report test successful!')
    console.log('\nAnalysis:')
    console.log(`- Total rows: ${response.data.analysis.totalRows}`)
    console.log(`- Columns found: ${response.data.analysis.columns.join(', ')}`)
    console.log(`- Supplier columns: ${response.data.analysis.supplierColumns.join(', ') || 'None found'}`)
    
    if (response.data.analysis.sampleRows.length > 0) {
      console.log('\nSample data (first 3 rows):')
      response.data.analysis.sampleRows.slice(0, 3).forEach((row, i) => {
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
    const url = new URL(CONSUMPTION_REPORT_URL)
    console.log('URL Components:')
    console.log(`- Account: buildasoilorganics`)
    console.log(`- Report ID: 1754406178416`)
    console.log(`- Format: ${url.searchParams.get('format')}`)
    console.log(`- Data type: ${url.searchParams.get('data')} (buildItem)`)
    console.log(`- Report title: ${url.searchParams.get('reportTitle')}`)
    
    // Decode filters to understand the report better
    const filtersParam = url.searchParams.get('filters')
    if (filtersParam) {
      const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
      const filters = JSON.parse(decodedFilters)
      console.log('\nReport Filters:')
      filters.forEach(filter => {
        console.log(`- ${filter[0]}: ${JSON.stringify(filter[1])}`)
      })
    }
    
    console.log('\n📝 Notes:')
    console.log('- This is a build/manufacturing consumption report')
    console.log('- Shows products consumed in the last 14 days')
    console.log('- Filtered for completed builds with item type "Consume"')
    console.log('- Could be useful for tracking material usage and production velocity')
    
  } catch (error) {
    console.error('Error analyzing URL:', error)
  }
}

// Run the test
testConsumptionReport().catch(console.error)