#!/usr/bin/env node

const REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)'

console.log('Testing report URL...\n')

fetch('http://localhost:3000/api/test-report-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reportUrl: REPORT_URL })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ Report test successful!')
    console.log('\nAnalysis:')
    console.log(`- Total rows: ${data.analysis.totalRows}`)
    console.log(`- Supplier columns found: ${data.analysis.supplierColumns.join(', ')}`)
    console.log(`- Products with suppliers: ${data.analysis.productsWithSuppliers}/${data.analysis.totalRows}`)
    console.log('\n' + data.recommendation)
    
    console.log('\nNow you can:')
    console.log('1. Save this URL in Settings > Finale API Configuration > Inventory Report URL')
    console.log('2. Switch data source to "Vercel KV (Cached)"')
    console.log('3. Click "Refresh Cache" to load the data')
  } else {
    console.error('❌ Test failed:', data.error)
  }
})
.catch(err => console.error('Error:', err.message))