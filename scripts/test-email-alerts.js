#!/usr/bin/env node

const { config } = require('dotenv')
config()

// Test the email alert system
async function testEmailAlerts() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  console.log('Testing Email Alert System...\n')
  
  // 1. Check queue status
  console.log('1. Checking email queue status...')
  try {
    const statsResponse = await fetch(`${baseUrl}/api/email-queue`)
    const stats = await statsResponse.json()
    
    if (stats.success) {
      console.log('   Queue Statistics:')
      console.log(`   - Waiting: ${stats.data.waiting}`)
      console.log(`   - Active: ${stats.data.active}`)
      console.log(`   - Completed: ${stats.data.completed}`)
      console.log(`   - Failed: ${stats.data.failed}`)
      console.log(`   - Total Pending: ${stats.data.total}`)
    } else {
      console.error('   Failed to get queue stats:', stats.error)
    }
  } catch (error) {
    console.error('   Error checking queue status:', error.message)
  }
  
  // 2. Send test email
  console.log('\n2. Sending test email...')
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'
  
  try {
    const response = await fetch(`${baseUrl}/api/email-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-test',
        data: {
          to: testEmail,
          subject: 'Test Email - Inventory System',
          htmlContent: `
            <h2>Test Email</h2>
            <p>This is a test email from the inventory management system.</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
            <hr>
            <p>If you received this, the email queue is working correctly!</p>
          `,
          textContent: `Test email from inventory system at ${new Date().toLocaleString()}`
        }
      })
    })
    
    const result = await response.json()
    if (result.success) {
      console.log(`   ✓ Test email queued successfully (Job ID: ${result.jobId})`)
    } else {
      console.error('   ✗ Failed to queue test email:', result.error)
    }
  } catch (error) {
    console.error('   Error sending test email:', error.message)
  }
  
  // 3. Send test alert (out-of-stock)
  console.log('\n3. Sending test out-of-stock alert...')
  try {
    const response = await fetch(`${baseUrl}/api/email-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-alert',
        data: {
          type: 'out-of-stock',
          count: 3,
          items: [
            {
              productSku: 'SOIL-001',
              productName: 'Premium Potting Soil',
              quantityOnHand: 0,
              reorderPoint: 50,
              reorderQuantity: 200,
              primarySupplierName: 'Soil Supplier Co.'
            },
            {
              productSku: 'FERT-002',
              productName: 'Organic Fertilizer',
              quantityOnHand: 0,
              reorderPoint: 25,
              reorderQuantity: 100,
              primarySupplierName: 'Green Nutrients Inc.'
            },
            {
              productSku: 'POT-003',
              productName: 'Clay Pots (6 inch)',
              quantityOnHand: 0,
              reorderPoint: 100,
              reorderQuantity: 500,
              primarySupplierName: 'Garden Supplies Ltd.'
            }
          ]
        }
      })
    })
    
    const result = await response.json()
    if (result.success) {
      console.log(`   ✓ Out-of-stock alert queued successfully (Job ID: ${result.jobId})`)
    } else {
      console.error('   ✗ Failed to queue alert:', result.error)
    }
  } catch (error) {
    console.error('   Error sending alert:', error.message)
  }
  
  // 4. Send test reorder alert
  console.log('\n4. Sending test reorder alert...')
  try {
    const response = await fetch(`${baseUrl}/api/email-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-alert',
        data: {
          type: 'reorder-needed',
          count: 5,
          items: [
            {
              productSku: 'SEED-001',
              productName: 'Tomato Seeds',
              quantityOnHand: 15,
              reorderPoint: 20,
              reorderQuantity: 100,
              primarySupplierName: 'Seed Company'
            },
            {
              productSku: 'TOOL-002',
              productName: 'Garden Trowel',
              quantityOnHand: 8,
              reorderPoint: 10,
              reorderQuantity: 50,
              primarySupplierName: 'Tool Supplier'
            }
          ]
        }
      })
    })
    
    const result = await response.json()
    if (result.success) {
      console.log(`   ✓ Reorder alert queued successfully (Job ID: ${result.jobId})`)
    } else {
      console.error('   ✗ Failed to queue alert:', result.error)
    }
  } catch (error) {
    console.error('   Error sending alert:', error.message)
  }
  
  // 5. Wait and check queue status again
  console.log('\n5. Waiting 3 seconds for queue processing...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('\n6. Final queue status check...')
  try {
    const statsResponse = await fetch(`${baseUrl}/api/email-queue`)
    const stats = await statsResponse.json()
    
    if (stats.success) {
      console.log('   Queue Statistics:')
      console.log(`   - Waiting: ${stats.data.waiting}`)
      console.log(`   - Active: ${stats.data.active}`)
      console.log(`   - Completed: ${stats.data.completed}`)
      console.log(`   - Failed: ${stats.data.failed}`)
      console.log(`   - Total Pending: ${stats.data.total}`)
      
      if (stats.data.failed > 0) {
        console.log('\n   ⚠️  There are failed jobs in the queue.')
        console.log('   You may want to retry them from the Settings page.')
      }
    }
  } catch (error) {
    console.error('   Error checking final status:', error.message)
  }
  
  console.log('\n✅ Email alert system test complete!')
  console.log('Check the configured email address for the test messages.')
  console.log('You can also view the Email Queue Manager in the Settings page.')
}

// Run the test
testEmailAlerts().catch(console.error)