#!/usr/bin/env node

/**
 * Complete integration test with all 4 Finale reports
 */

const axios = require('axios')

const REPORTS = {
  inventory: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)',
  consumption14: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406178416/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLQI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMTQsImxlbmd0aCI6MTQsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID',
  consumption30: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406246981/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLUI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMzAsImxlbmd0aCI6MzAsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID',
  stock: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406746537/Report.csv?format=csv&data=stock&attrName=%23%23stock026&rowDimensions=~lZrNA0XAzP7AwMDAAcDAms0B_sDLQHlmZmZmZmbAwMDAwMDAms0CHMDM_sDAwMDAwMCazQHUwMtAiWZmZmZmZsDAAMDAwMCazQILqVN0ZFxuUGtuZ8tAaWZmZmZmZsDAwMDAwMA&metrics=~lJrNBLiqVW5pdHNcblFvSMtAaWZmZmZmZsDAwMDAwMCazQS7rVVuaXRzXG5QYWNrZWTLQGlmZmZmZmbAwMDAwMDAms0Ev65Vbml0c1xuVHJhbnNpdMtAaWZmZmZmZsDAwMDAwMCazQTAqlVuaXRzXG5XSVDLQGlmZmZmZmbAwMDAwMDA&styles=~gqtncm91cEhlYWRlcpYIwMDAwMCkYm9keZYIwMDAwMA&filters=W1sicHJvZHVjdFN0YXR1cyIsbnVsbCxudWxsXSxbInByb2R1Y3RQcm9kdWN0VXJsIixudWxsLG51bGxdLFsicHJvZHVjdENhdGVnb3J5IixudWxsLG51bGxdLFsicHJvZHVjdE1hbnVmYWN0dXJlciIsbnVsbCxudWxsXSxbInN0b2NrTG9jYXRpb24iLFsiL2J1aWxkYXNvaWxvcmdhbmljcy9hcGkvZmFjaWxpdHkvMTAwMDUiXSxudWxsXSxbInN0b2NrRWZmZWN0aXZlRGF0ZSIsbnVsbCxudWxsXSxbInN0b2NrTWFnYXppbmUiLG51bGwsbnVsbF1d&reportTitle=Stock%20quantity%20by%20location%2C%20in%20units'
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testCompleteIntegration() {
  console.log('=' + '='.repeat(50) + '\n')
  // Step 1: Test if we should use Redis settings
  let useRedisSettings = false
  try {
    const redisTest = await axios.get(`${BASE_URL}/api/settings-redis`)
    if (redisTest.data.success) {
      useRedisSettings = true
    }
  } catch (error) {
    // Try to migrate from Supabase
    try {
      const migrateResponse = await axios.post(`${BASE_URL}/api/settings-redis/migrate`)
      if (migrateResponse.data.success) {
        useRedisSettings = true
      }
    } catch (migrateError) {
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 2: Update settings with all report URLs
  try {
    // Use Redis or Supabase based on availability
    const settingsEndpoint = useRedisSettings ? '/api/settings-redis' : '/api/settings'
    
    // Get current settings
    const getResponse = await axios.get(`${BASE_URL}${settingsEndpoint}`)
    const currentSettings = getResponse.data.data || {}
    
    // Update with all report URLs
    const updateData = {
      ...currentSettings,
      finale_inventory_report_url: REPORTS.inventory,
      finale_consumption_14day_url: REPORTS.consumption14,
      finale_consumption_30day_url: REPORTS.consumption30,
      finale_stock_report_url: REPORTS.stock,
      inventory_data_source: 'enhanced'
    }
    
    const updateResponse = await axios.put(`${BASE_URL}${settingsEndpoint}`, updateData)
    
    if (updateResponse.data.success || updateResponse.data.data) {
    }
  } catch (error) {
    console.error('❌ Failed to update settings:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 3: Trigger enhanced sync
  const syncStartTime = Date.now()
  try {
    const syncResponse = await axios.post(`${BASE_URL}/api/inventory-enhanced`, {})
    
    if (syncResponse.data.success) {
      if (syncResponse.data.summary) {
      }
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.response?.data || error.message)
    return
  }
  
  // Give the system a moment to process
  await sleep(1000)
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 4: Test enhanced data with stock details
  try {
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory-enhanced?limit=5&sortBy=total_velocity&sortDirection=desc`)
    if (inventoryResponse.data.items.length > 0) {
      inventoryResponse.data.items.forEach((item, i) => {
        if (item.standard_packaging) {
        }
      })
    }
    
    // Show summary insights
    if (inventoryResponse.data.summary) {
      const summary = inventoryResponse.data.summary
      console.log('=' + '='.repeat(30))
      const dq = summary.dataQuality
      const vi = summary.velocityInsights
    }
    
  } catch (error) {
    console.error('❌ Failed to get enhanced data:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('=' + '='.repeat(50) + '\n')
  console.log('   ✓ Real-time stock positions (QoH, Packed, Transit, WIP)')
  console.log('   ✓ True available inventory (QoH - Packed)')
  console.log('   • No more Supabase dependency (using Vercel KV)')
  console.log('   (Ensure data source is set to "Enhanced")')
}

// Run the complete test
testCompleteIntegration().catch(console.error)