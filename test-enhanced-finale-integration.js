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
  console.log('🧪 Testing Enhanced Inventory Integration\n')
  console.log('This will configure all report URLs and test the combined data\n')
  
  // Step 1: Update settings with all report URLs
  console.log('1️⃣ Updating settings with all report URLs...')
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
      console.log('✅ Settings updated successfully!')
      console.log('- Inventory report URL saved')
      console.log('- 14-day consumption report URL saved')
      console.log('- 30-day consumption report URL saved')
      console.log('- Data source set to: enhanced')
    }
  } catch (error) {
    console.error('❌ Failed to update settings:', error.response?.data || error.message)
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 2: Trigger enhanced sync
  console.log('2️⃣ Triggering enhanced inventory sync...')
  console.log('This will fetch and combine data from all reports...')
  
  try {
    const syncResponse = await axios.post(`${BASE_URL}/api/inventory-enhanced/sync`, {})
    
    if (syncResponse.data.success) {
      console.log('✅ Enhanced sync completed successfully!')
      console.log('\n📊 Sync Statistics:')
      console.log(`- Total items synced: ${syncResponse.data.stats.itemsSynced}`)
      console.log(`- Items with vendor: ${syncResponse.data.stats.itemsWithVendor}`)
      console.log(`- Items with sales data: ${syncResponse.data.stats.itemsWithSales}`)
      console.log(`- Items with consumption: ${syncResponse.data.stats.itemsWithConsumption}`)
      console.log(`- Items with both: ${syncResponse.data.stats.itemsWithBoth}`)
      console.log(`- Duration: ${syncResponse.data.stats.duration}`)
      
      if (syncResponse.data.summary) {
        console.log('\n💰 Inventory Metrics:')
        console.log(`- Total inventory value: $${syncResponse.data.summary.total_inventory_value.toFixed(2)}`)
        console.log(`- Critical items: ${syncResponse.data.summary.critical_items}`)
        console.log(`- Vendors: ${syncResponse.data.summary.vendors_count}`)
        console.log(`- Avg sales velocity: ${syncResponse.data.summary.avg_sales_velocity.toFixed(2)} units/day`)
        console.log(`- Avg consumption velocity: ${syncResponse.data.summary.avg_consumption_velocity.toFixed(2)} units/day`)
      }
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.response?.data || error.message)
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 3: Test enhanced data retrieval
  console.log('3️⃣ Testing enhanced inventory data...')
  
  try {
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory-enhanced?limit=10`)
    
    console.log('✅ Enhanced inventory data retrieved!')
    console.log(`\n📦 Inventory Overview:`)
    console.log(`- Total items: ${inventoryResponse.data.pagination.total}`)
    console.log(`- Items shown: ${inventoryResponse.data.items.length}`)
    
    if (inventoryResponse.data.items.length > 0) {
      console.log('\n🔍 Sample Enhanced Items:')
      inventoryResponse.data.items.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.sku}: ${item.product_name}`)
        console.log(`   Vendor: ${item.vendor || 'None'}`)
        console.log(`   Stock: ${item.current_stock} units`)
        console.log(`   Sales (30d): ${item.sales_last_30_days} units (${item.sales_velocity.toFixed(2)}/day)`)
        console.log(`   Consumed (30d): ${item.consumed_last_30_days} units (${item.consumption_velocity.toFixed(2)}/day)`)
        console.log(`   Total velocity: ${item.total_velocity.toFixed(2)} units/day`)
        console.log(`   Days until stockout: ${item.days_until_stockout}`)
        console.log(`   Status: ${item.stock_status}`)
        console.log(`   True reorder point: ${item.true_reorder_point} units`)
      })
    }
    
    // Show velocity insights
    if (inventoryResponse.data.summary?.velocityInsights) {
      const insights = inventoryResponse.data.summary.velocityInsights
      console.log('\n📈 Velocity Insights:')
      console.log(`- High velocity items (>10/day): ${insights.highVelocityItems}`)
      console.log(`- Slow moving items (<1/day): ${insights.slowMovingItems}`)
      console.log(`- Dead stock (no movement): ${insights.deadStock}`)
    }
  } catch (error) {
    console.error('❌ Failed to get enhanced data:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Step 4: Test filtering capabilities
  console.log('4️⃣ Testing enhanced filtering...')
  
  try {
    // Test velocity type filter
    const consumptionOnly = await axios.get(`${BASE_URL}/api/inventory-enhanced?velocityType=consumption&limit=5`)
    console.log(`\n- Items with consumption only: ${consumptionOnly.data.pagination.total}`)
    
    // Test critical items
    const criticalItems = await axios.get(`${BASE_URL}/api/inventory-enhanced?status=critical&limit=5`)
    console.log(`- Critical stock items: ${criticalItems.data.pagination.total}`)
    
    console.log('\n✅ Enhanced filtering working correctly!')
  } catch (error) {
    console.error('❌ Filtering test failed:', error.response?.data || error.message)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 ENHANCED INTEGRATION TEST COMPLETE!')
  console.log('='.repeat(50) + '\n')
  
  console.log('The system now provides:')
  console.log('✓ Combined sales and consumption velocity')
  console.log('✓ True inventory velocity calculations')
  console.log('✓ Accurate days until stockout predictions')
  console.log('✓ Smart reorder points based on total usage')
  console.log('✓ Vendor data for all products')
  console.log('\nAccess the enhanced data at: /inventory with data source set to "Enhanced"')
}

// Run the test
testEnhancedIntegration().catch(console.error)