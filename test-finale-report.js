#!/usr/bin/env node

/**
 * Test the Finale report URL to see what data it contains
 */

const axios = require('axios')

const REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)'

async function testFinaleReport() {
  // First, let's call our test-report-api endpoint
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: REPORT_URL
    })
    if (response.data.analysis.sampleRows.length > 0) {
      response.data.analysis.sampleRows.slice(0, 3).forEach((row, i) => {
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
  
  // Now let's check what the URL structure tells us
  try {
    const url = new URL(REPORT_URL)
    // Decode the filters
    const filtersParam = url.searchParams.get('filters')
    if (filtersParam) {
      const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
    }
    
    // Decode row dimensions
    const rowDimensions = url.searchParams.get('rowDimensions')
    if (rowDimensions) {
      console.log('\nRow Dimensions (encoded):')
      // The encoding looks like MessagePack or similar binary format
    }
    console.log('- The attrName parameter (%23%23user200) might be a custom field')
  } catch (error) {
    console.error('Error analyzing URL:', error)
  }
}

// Run the test
testFinaleReport().catch(console.error)