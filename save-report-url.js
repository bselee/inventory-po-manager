#!/usr/bin/env node

/**
 * Save the Finale report URL to settings
 */

const axios = require('axios')

const REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)'

async function saveReportUrl() {
  try {
    // First get current settings
    const getResponse = await axios.get('http://localhost:3000/api/settings')
    const currentSettings = getResponse.data.data || {}
    // Update settings with report URL
    const updateResponse = await axios.put('http://localhost:3000/api/settings', {
      ...currentSettings,
      finale_inventory_report_url: REPORT_URL,
      inventory_data_source: 'vercel-kv' // Switch to KV to test
    })
    
    if (updateResponse.data.success) {
    } else {
      console.error('❌ Failed to update settings:', updateResponse.data.error)
    }
    
    // Now trigger a sync to populate the cache
    try {
      const syncResponse = await axios.post('http://localhost:3000/api/inventory/sync', {})
      
      if (syncResponse.data.success) {
      } else {
        console.error('❌ Sync failed:', syncResponse.data.error)
      }
    } catch (syncError) {
      if (syncError.response?.status === 409) {
      } else {
        console.error('❌ Sync error:', syncError.response?.data || syncError.message)
      }
    }
    
    // Check the results
    const inventoryResponse = await axios.get('http://localhost:3000/api/inventory-kv?limit=5')
    if (inventoryResponse.data.items.length > 0) {
      inventoryResponse.data.items.slice(0, 3).forEach(item => {
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)
  }
}

// Run the update
saveReportUrl().catch(console.error)