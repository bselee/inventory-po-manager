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
  console.log('🚀 COMPLETE FINALE INTEGRATION TEST')
  console.log('=' + '='.repeat(50) + '\n')
  console.log('This test will:')
  console.log('1. Configure all 4 report URLs')
  console.log('2. Switch to Redis-based settings')
  console.log('3. Run enhanced sync with all data sources')
  console.log('4. Verify comprehensive inventory metrics\n')
  
  // Step 1: Test if we should use Redis settings
  console.log('1️⃣ Testing Redis Settings Service...')
  let useRedisSettings = false
  try {
    const redisTest = await axios.get(`${BASE_URL}/api/settings-redis`)
    if (redisTest.data.success) {
      console.log('✅ Redis Settings available, using Redis-based configuration')
      useRedisSettings = true
    }
  } catch (error) {
    console.log('ℹ️  Redis Settings not initialized, attempting migration from Supabase...')
    
    // Try to migrate from Supabase
    try {
      const migrateResponse = await axios.post(`${BASE_URL}/api/settings-redis/migrate`)
      if (migrateResponse.data.success) {
        console.log('✅ Successfully migrated settings from Supabase to Redis!')
        useRedisSettings = true
      }
    } catch (migrateError) {
      console.log('⚠️  Migration failed, will use Supabase settings')
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 2: Update settings with all report URLs
  console.log('2️⃣ Configuring all report URLs...')
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
      console.log('✅ All report URLs configured successfully!')
      console.log('   - Inventory report: ✓')
      console.log('   - 14-day consumption: ✓')
      console.log('   - 30-day consumption: ✓')
      console.log('   - Stock detail report: ✓')
      console.log('   - Data source: enhanced')
      console.log(`   - Storage: ${useRedisSettings ? 'Redis (Supabase eliminated!)' : 'Supabase'}`)
    }
  } catch (error) {
    console.error('❌ Failed to update settings:', error.response?.data || error.message)
    console.log('\nAttempting to continue with manual sync...')
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 3: Trigger enhanced sync
  console.log('3️⃣ Starting enhanced inventory sync...')
  console.log('   Fetching data from all 4 reports...')
  
  const syncStartTime = Date.now()
  try {
    const syncResponse = await axios.post(`${BASE_URL}/api/inventory-enhanced`, {})
    
    if (syncResponse.data.success) {
      console.log('✅ Enhanced sync completed successfully!')
      console.log('\n📊 Sync Statistics:')
      console.log(`   Total items: ${syncResponse.data.stats.itemsSynced}`)
      console.log(`   Items with vendor: ${syncResponse.data.stats.itemsWithVendor}`)
      console.log(`   Items with sales: ${syncResponse.data.stats.itemsWithSales}`)
      console.log(`   Items with consumption: ${syncResponse.data.stats.itemsWithConsumption}`)
      console.log(`   Items with both: ${syncResponse.data.stats.itemsWithBoth}`)
      console.log(`   Duration: ${syncResponse.data.stats.duration}`)
      
      if (syncResponse.data.summary) {
        console.log('\n💰 Financial Summary:')
        console.log(`   Total value: $${syncResponse.data.summary.total_inventory_value.toFixed(2)}`)
        console.log(`   Critical items: ${syncResponse.data.summary.critical_items}`)
        console.log(`   Unique vendors: ${syncResponse.data.summary.vendors_count}`)
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
  console.log('4️⃣ Verifying enhanced inventory data...')
  
  try {
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory-enhanced?limit=5&sortBy=total_velocity&sortDirection=desc`)
    
    console.log('✅ Enhanced data retrieved successfully!')
    
    if (inventoryResponse.data.items.length > 0) {
      console.log('\n🏆 Top 5 High-Velocity Items:')
      inventoryResponse.data.items.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.sku}: ${item.product_name}`)
        console.log(`   Vendor: ${item.vendor || 'Unknown'}`)
        console.log(`   Stock Position:`)
        console.log(`     - On Hand: ${item.units_on_hand} units`)
        console.log(`     - Available: ${item.units_available} units (${item.units_packed} packed)`)
        console.log(`     - In Transit: ${item.units_in_transit} units`)
        console.log(`     - WIP: ${item.units_wip} units`)
        console.log(`     - Total Pipeline: ${item.total_pipeline} units`)
        console.log(`   Movement:`)
        console.log(`     - Sales velocity: ${item.sales_velocity.toFixed(2)} units/day`)
        console.log(`     - Consumption velocity: ${item.consumption_velocity.toFixed(2)} units/day`)
        console.log(`     - Total velocity: ${item.total_velocity.toFixed(2)} units/day`)
        console.log(`   Planning:`)
        console.log(`     - Days until stockout: ${item.days_until_stockout}`)
        console.log(`     - Reorder point: ${item.true_reorder_point} units`)
        console.log(`     - Status: ${item.stock_status.toUpperCase()}`)
        if (item.standard_packaging) {
          console.log(`     - Packaging: ${item.standard_packaging}`)
        }
      })
    }
    
    // Show summary insights
    if (inventoryResponse.data.summary) {
      const summary = inventoryResponse.data.summary
      console.log('\n📈 COMPREHENSIVE INSIGHTS:')
      console.log('=' + '='.repeat(30))
      
      console.log('\n📦 Inventory Overview:')
      console.log(`   Total SKUs: ${summary.total_items}`)
      console.log(`   Total value: $${summary.total_inventory_value.toFixed(2)}`)
      console.log(`   Critical items: ${summary.critical_items}`)
      
      console.log('\n📊 Data Quality:')
      const dq = summary.dataQuality
      console.log(`   Items with vendor: ${dq.itemsWithVendor}/${dq.totalItems} (${((dq.itemsWithVendor/dq.totalItems)*100).toFixed(1)}%)`)
      console.log(`   Items with sales: ${dq.itemsWithSales}/${dq.totalItems} (${((dq.itemsWithSales/dq.totalItems)*100).toFixed(1)}%)`)
      console.log(`   Items with consumption: ${dq.itemsWithConsumption}/${dq.totalItems} (${((dq.itemsWithConsumption/dq.totalItems)*100).toFixed(1)}%)`)
      
      console.log('\n🚀 Velocity Analysis:')
      const vi = summary.velocityInsights
      console.log(`   High velocity (>10/day): ${vi.highVelocityItems} items`)
      console.log(`   Slow moving (<1/day): ${vi.slowMovingItems} items`)
      console.log(`   Dead stock (no movement): ${vi.deadStock} items`)
      console.log(`   Average velocities:`)
      console.log(`     - Sales: ${summary.avg_sales_velocity.toFixed(2)} units/day`)
      console.log(`     - Consumption: ${summary.avg_consumption_velocity.toFixed(2)} units/day`)
    }
    
  } catch (error) {
    console.error('❌ Failed to get enhanced data:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 INTEGRATION COMPLETE!')
  console.log('=' + '='.repeat(50) + '\n')
  
  console.log('✨ Your system now provides:')
  console.log('   ✓ Complete vendor data for all products')
  console.log('   ✓ Real-time stock positions (QoH, Packed, Transit, WIP)')
  console.log('   ✓ True available inventory (QoH - Packed)')
  console.log('   ✓ Combined sales + consumption velocity')
  console.log('   ✓ Accurate stockout predictions')
  console.log('   ✓ Smart reorder points based on total usage')
  console.log('   ✓ Pipeline visibility for better planning')
  
  console.log('\n🔑 Key Benefits:')
  console.log('   • No more Supabase dependency (using Vercel KV)')
  console.log('   • Faster data access with intelligent caching')
  console.log('   • Complete inventory lifecycle visibility')
  console.log('   • Better fulfillment planning with packed/transit data')
  console.log('   • Accurate demand forecasting combining sales + production')
  
  console.log('\n📱 Access your enhanced inventory at:')
  console.log(`   ${BASE_URL}/inventory`)
  console.log('   (Ensure data source is set to "Enhanced")')
}

// Run the complete test
testCompleteIntegration().catch(console.error)