#!/usr/bin/env node

/**
 * Test the Finale report URL to see what data it contains
 */

const axios = require('axios')

const REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)'

async function testFinaleReport() {
  console.log('🧪 Testing Finale Report URL\n')
  
  // First, let's call our test-report-api endpoint
  console.log('1️⃣ Testing via API endpoint...')
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: REPORT_URL
    })
    
    console.log('✅ Report test successful!')
    console.log('\nAnalysis:')
    console.log(`- Total rows: ${response.data.analysis.totalRows}`)
    console.log(`- Columns found: ${response.data.analysis.columns.join(', ')}`)
    console.log(`- Supplier columns: ${response.data.analysis.supplierColumns.join(', ') || 'None found'}`)
    console.log(`- Products with suppliers: ${response.data.analysis.productsWithSuppliers}`)
    
    if (response.data.analysis.sampleRows.length > 0) {
      console.log('\nSample data:')
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
  
  // Now let's check what the URL structure tells us
  console.log('2️⃣ Analyzing URL structure...')
  try {
    const url = new URL(REPORT_URL)
    console.log('URL Components:')
    console.log(`- Account: buildasoilorganics`)
    console.log(`- Report ID: 1754405698024`)
    console.log(`- Format: ${url.searchParams.get('format')}`)
    console.log(`- Data type: ${url.searchParams.get('data')}`)
    
    // Decode the filters
    const filtersParam = url.searchParams.get('filters')
    if (filtersParam) {
      const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
      console.log(`- Filters: ${decodedFilters}`)
    }
    
    // Decode row dimensions
    const rowDimensions = url.searchParams.get('rowDimensions')
    if (rowDimensions) {
      console.log('\nRow Dimensions (encoded):')
      console.log(`- ${rowDimensions}`)
      // The encoding looks like MessagePack or similar binary format
    }
    
    console.log('\n📝 Notes:')
    console.log('- This appears to be a product report with stock and sales data')
    console.log('- The attrName parameter (%23%23user200) might be a custom field')
    console.log('- To include supplier data, you may need to:')
    console.log('  1. Edit the report in Finale to add supplier/vendor columns')
    console.log('  2. Or create a new report that includes supplier information')
    console.log('  3. Look for custom fields that might contain supplier data')
    
  } catch (error) {
    console.error('Error analyzing URL:', error)
  }
}

// Run the test
testFinaleReport().catch(console.error)