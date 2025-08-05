#!/usr/bin/env node

/**
 * Test the 30-day Finale consumption report URL and compare with 14-day
 */

const axios = require('axios')

const CONSUMPTION_30DAY_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406246981/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLUI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMzAsImxlbmd0aCI6MzAsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID'

async function testConsumption30Day() {
  console.log('🧪 Testing 30-Day Finale Consumption Report\n')
  
  // Test via our API endpoint
  console.log('1️⃣ Testing via API endpoint...')
  try {
    const response = await axios.post('http://localhost:3000/api/test-report-api', {
      reportUrl: CONSUMPTION_30DAY_URL
    })
    
    console.log('✅ Report test successful!')
    console.log('\n📊 30-Day Consumption Analysis:')
    console.log(`- Total rows: ${response.data.analysis.totalRows}`)
    console.log(`- Unique products consumed: ${response.data.analysis.totalRows}`)
    console.log(`- Products with supplier data: ${response.data.analysis.productsWithSuppliers}`)
    
    // Analyze consumption patterns
    if (response.data.analysis.sampleRows.length > 0) {
      console.log('\n🏭 Top Consumed Products (first 5):')
      response.data.analysis.sampleRows.slice(0, 5).forEach((row, i) => {
        if (row['Product ID']) {
          const qty = row['Quantity\nsum'] || row['Quantity'] || 0
          console.log(`${i + 1}. ${row['Product ID']} - ${row['Description'] || 'No description'}`)
          console.log(`   Supplier: ${row['Supplier 1'] || 'Unknown'}`)
          console.log(`   Quantity consumed: ${qty}`)
          console.log(`   On hand: ${row['Quantity on hand case equivalents'] || 'N/A'}`)
        }
      })
    }
    
    console.log('\n📈 Consumption Insights:')
    console.log('- This shows actual material usage from manufacturing/builds')
    console.log('- Different from sales data - shows internal consumption')
    console.log('- Useful for calculating true inventory velocity')
    console.log('- Can help predict reorder needs based on production patterns')
    
  } catch (error) {
    console.error('❌ Error testing report:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Compare with 14-day data
  console.log('2️⃣ Consumption Comparison:')
  console.log('14-day report: 455 consumed items')
  console.log('30-day report: Testing now...')
  
  // Decode filters to confirm the date range
  const url = new URL(CONSUMPTION_30DAY_URL)
  const filtersParam = url.searchParams.get('filters')
  if (filtersParam) {
    const decodedFilters = Buffer.from(filtersParam, 'base64').toString()
    const filters = JSON.parse(decodedFilters)
    const dateFilter = filters.find(f => f[0] === 'buildCompleteDate')
    if (dateFilter) {
      console.log(`\nDate range: ${dateFilter[1].length} days (offset: ${dateFilter[1].offset})`)
    }
  }
  
  console.log('\n💡 Integration Possibilities:')
  console.log('1. Add "consumption velocity" metric to inventory items')
  console.log('2. Create alerts for items with high consumption but low stock')
  console.log('3. Compare consumption vs sales to identify manufacturing inefficiencies')
  console.log('4. Use consumption data for more accurate reorder calculations')
  console.log('5. Track supplier performance based on consumed materials quality')
}

// Run the test
testConsumption30Day().catch(console.error)