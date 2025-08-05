#!/usr/bin/env node

/**
 * Save the Finale report URL to settings
 */

const axios = require('axios')

const REPORT_URL = 'https://app.finaleinventory.com/buildasoilorganics/doc/report/pivotTableStream/1754405698024/Report.csv?format=csv&data=product&attrName=%23%23user200&rowDimensions=~lprNAhzAzP7AwMDAwMDAms0B_sDM_sDAwMDAwMCas3Byb2R1Y3RVbml0c0luU3RvY2vAzP7AwMDAwMDAmrdwcm9kdWN0UHJvZHVjdERldGFpbFVybKN1cmzM_sDAwMDAwMCatnByb2R1Y3RTYWxlc0xhc3QzMERheXPAzP7AwMDAwMDAmrZwcm9kdWN0U2FsZXNMYXN0OTBEYXlzwMz-wMDAwMDAwA&filters=W1sicHJvZHVjdFN0YXR1cyIsWyJQUk9EVUNUX0FDVElWRSJdLG51bGxdXQ%3D%3D&reportTitle=Purchase%20Orders%20Report%20(API)'

async function saveReportUrl() {
  console.log('💾 Saving Finale Report URL to settings\n')
  
  try {
    // First get current settings
    console.log('1️⃣ Getting current settings...')
    const getResponse = await axios.get('http://localhost:3000/api/settings')
    const currentSettings = getResponse.data.data || {}
    
    console.log('Current data source:', currentSettings.inventory_data_source || 'supabase')
    
    // Update settings with report URL
    console.log('\n2️⃣ Updating settings with report URL...')
    const updateResponse = await axios.put('http://localhost:3000/api/settings', {
      ...currentSettings,
      finale_inventory_report_url: REPORT_URL,
      inventory_data_source: 'vercel-kv' // Switch to KV to test
    })
    
    if (updateResponse.data.success) {
      console.log('✅ Settings updated successfully!')
      console.log('- Report URL saved')
      console.log('- Data source set to: vercel-kv')
    } else {
      console.error('❌ Failed to update settings:', updateResponse.data.error)
    }
    
    // Now trigger a sync to populate the cache
    console.log('\n3️⃣ Triggering inventory sync...')
    try {
      const syncResponse = await axios.post('http://localhost:3000/api/inventory/sync', {})
      
      if (syncResponse.data.success) {
        console.log('✅ Sync completed successfully!')
        console.log(`- Items synced: ${syncResponse.data.stats.itemsSynced}`)
        console.log(`- Items with vendor: ${syncResponse.data.stats.itemsWithVendor}`)
        console.log(`- Vendors found: ${syncResponse.data.stats.vendorsFound || 'N/A'}`)
        console.log(`- Duration: ${syncResponse.data.stats.duration}`)
      } else {
        console.error('❌ Sync failed:', syncResponse.data.error)
      }
    } catch (syncError) {
      if (syncError.response?.status === 409) {
        console.log('⚠️  Sync already in progress')
      } else {
        console.error('❌ Sync error:', syncError.response?.data || syncError.message)
      }
    }
    
    // Check the results
    console.log('\n4️⃣ Checking inventory data...')
    const inventoryResponse = await axios.get('http://localhost:3000/api/inventory-kv?limit=5')
    
    console.log(`\n📊 Inventory Summary:`)
    console.log(`- Total items: ${inventoryResponse.data.pagination.total}`)
    console.log(`- Items with vendor: ${inventoryResponse.data.summary.dataQuality.itemsWithVendor}`)
    console.log(`- Cache source: ${inventoryResponse.data.cacheInfo.source}`)
    
    if (inventoryResponse.data.items.length > 0) {
      console.log('\nSample items with vendors:')
      inventoryResponse.data.items.slice(0, 3).forEach(item => {
        console.log(`- ${item.sku}: ${item.product_name} | Vendor: ${item.vendor || 'None'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)
  }
}

// Run the update
saveReportUrl().catch(console.error)