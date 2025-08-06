#!/usr/bin/env node

/**
 * Test the enhanced inventory integration with consumption data
 */

const axios = require('axios')

const REPORTS = {
  inventory: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)',
  consumption14: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406178416/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLUI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMTQsImxlbmd0aCI6MTQsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID',
  consumption30: 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754406246981/Report.csv?format=csv&data=buildItem&attrName=%23%23builds001&rowDimensions=~lprNAf7AzQF9wMDAwMDAwJrNAhzAzP7AwMDAAMDAms0B1MDLUI-rrhR64UjAwMDAwMDAmgzAzP7AwMDAwMDAms0CFMDM_sDAwMDAwMCaEsDM_sDAwMDAwMA&metrics=~kZrNBI7AzP7AwMDAwMDA&filters=W1siYnVpbGRXb3JrRWZmb3J0VXJsIiwiIixudWxsXSxbImJ1aWxkUHJvZHVjdFRvQ29uc3VtZSIsbnVsbCxudWxsXSxbImJ1aWxkQ29tcGxldGVEYXRlIix7ImR1cmF0aW9uIjoiZGF5Iiwib2Zmc2V0IjotMzAsImxlbmd0aCI6MzAsInRpbWV6b25lIjoiQW1lcmljYS9EZW52ZXIifSxudWxsXSxbImJ1aWxkU3RhdHVzIixbIlBSVU5fQ09NUExFVEVEIl0sbnVsbF0sWyJGb3JtdWxhRmlsdGVyIiwibG9va3VwKFwiYnVpbGRJdGVtSXRlbVR5cGVcIikgPT0gXCJDb25zdW1lXCIiLG51bGxdXQ%3D%3D&reportTitle=Consumed%20products%20by%20product%20ID'
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function testEnhancedIntegration() {
  // Step 1: Update settings with all report URLs
  try {
    // Get current settings
    const getResponse = await axios.get(`${BASE_URL}/api/settings`)
    const currentSettings = getResponse.data.data || {}
    
    // Update with all report URLs
    const updateResponse = await axios.put(`${BASE_URL}/api/settings`, {
      ...currentSettings,
      finale_inventory_report_url: REPORTS.inventory,
      finale_consumption_14day_url: REPORTS.consumption14,
      finale_consumption_30day_url: REPORTS.consumption30,
      inventory_data_source: 'enhanced'
    })
    
    if (updateResponse.data.success) {
    }
  } catch (error) {
    console.error('❌ Failed to update settings:', error.response?.data || error.message)
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 2: Trigger enhanced sync
  try {
    const syncResponse = await axios.post(`${BASE_URL}/api/inventory-enhanced/sync`, {})
    
    if (syncResponse.data.success) {
      if (syncResponse.data.summary) {
      }
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.response?.data || error.message)
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 3: Test enhanced data retrieval
  try {
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory-enhanced?limit=10`)
    if (inventoryResponse.data.items.length > 0) {
      inventoryResponse.data.items.slice(0, 3).forEach((item, i) => {
      })
    }
    
    // Show velocity insights
    if (inventoryResponse.data.summary?.velocityInsights) {
      const insights = inventoryResponse.data.summary.velocityInsights
    }
  } catch (error) {
    console.error('❌ Failed to get enhanced data:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 4: Test filtering capabilities
  try {
    // Test velocity type filter
    const consumptionOnly = await axios.get(`${BASE_URL}/api/inventory-enhanced?velocityType=consumption&limit=5`)
    // Test critical items
    const criticalItems = await axios.get(`${BASE_URL}/api/inventory-enhanced?status=critical&limit=5`)
  } catch (error) {
    console.error('❌ Filtering test failed:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('='.repeat(50) + '\n')
}

// Run the test
testEnhancedIntegration().catch(console.error)