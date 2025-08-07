/**
 * Test script for PO generation system
 * Run with: node scripts/test-po-generation.js
 */

const fetch = require('node-fetch')

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

async function testPOGeneration() {
  console.log('Testing PO Generation System...\n')
  
  try {
    // Test 1: Get PO suggestions
    console.log('1. Testing PO suggestions endpoint...')
    const suggestionsResponse = await fetch(`${API_BASE}/api/purchase-orders/generate`)
    if (!suggestionsResponse.ok) {
      throw new Error(`Failed to fetch suggestions: ${suggestionsResponse.status}`)
    }
    const suggestionsData = await suggestionsResponse.json()
    console.log(`   ✓ Found ${suggestionsData.suggestions?.length || 0} vendor suggestions`)
    console.log(`   ✓ Critical vendors: ${suggestionsData.summary?.critical_vendors || 0}`)
    console.log(`   ✓ Total items to order: ${suggestionsData.summary?.total_items_to_order || 0}`)
    console.log(`   ✓ Estimated cost: $${suggestionsData.summary?.estimated_total_cost?.toFixed(2) || '0.00'}\n`)
    
    // Test 2: Get reorder suggestions with analysis
    console.log('2. Testing reorder suggestions with analysis...')
    const reorderResponse = await fetch(`${API_BASE}/api/purchase-orders/suggestions?include_analysis=true`)
    if (!reorderResponse.ok) {
      throw new Error(`Failed to fetch reorder suggestions: ${reorderResponse.status}`)
    }
    const reorderData = await reorderResponse.json()
    console.log(`   ✓ Items needing reorder: ${reorderData.total_count || 0}`)
    if (reorderData.analysis) {
      console.log(`   ✓ Critical items: ${reorderData.analysis.critical_items}`)
      console.log(`   ✓ Vendors affected: ${reorderData.analysis.vendors_affected}`)
      console.log(`   ✓ Estimated total cost: $${reorderData.analysis.estimated_total_cost?.toFixed(2) || '0.00'}\n`)
    }
    
    // Test 3: Create a test PO
    console.log('3. Testing PO creation...')
    const testPO = {
      vendor_name: 'Test Vendor',
      vendor_email: 'test@vendor.com',
      items: [
        {
          sku: 'TEST-001',
          product_name: 'Test Product 1',
          quantity: 10,
          unit_cost: 25.00,
          notes: 'Test item'
        },
        {
          sku: 'TEST-002',
          product_name: 'Test Product 2',
          quantity: 5,
          unit_cost: 50.00,
          notes: 'Another test item'
        }
      ],
      shipping_cost: 15.00,
      tax_amount: 25.00,
      notes: 'Test PO created by test script'
    }
    
    const createResponse = await fetch(`${API_BASE}/api/purchase-orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPO)
    })
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      throw new Error(`Failed to create PO: ${errorData.error}`)
    }
    
    const createData = await createResponse.json()
    const poId = createData.purchase_order?.id
    const poNumber = createData.purchase_order?.po_number
    console.log(`   ✓ Created PO: ${poNumber}`)
    console.log(`   ✓ Total amount: $${createData.purchase_order?.total_amount?.toFixed(2)}\n`)
    
    // Test 4: Approve the PO
    if (poId) {
      console.log('4. Testing PO approval...')
      const approveResponse = await fetch(`${API_BASE}/api/purchase-orders/${poId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: 'test-script',
          notes: 'Approved by test script'
        })
      })
      
      if (!approveResponse.ok) {
        const errorData = await approveResponse.json()
        console.log(`   ⚠ Could not approve PO: ${errorData.error}`)
      } else {
        const approveData = await approveResponse.json()
        console.log(`   ✓ PO approved successfully`)
        console.log(`   ✓ Status: ${approveData.purchase_order?.status}\n`)
      }
      
      // Test 5: Try to reject an approved PO (should fail)
      console.log('5. Testing rejection of approved PO (should fail)...')
      const rejectResponse = await fetch(`${API_BASE}/api/purchase-orders/${poId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejected_by: 'test-script',
          reason: 'Test rejection',
          notes: 'Should fail because PO is already approved'
        })
      })
      
      if (rejectResponse.ok) {
        console.log('   ✗ Unexpected: Rejection succeeded when it should have failed')
      } else {
        const errorData = await rejectResponse.json()
        console.log(`   ✓ Rejection correctly prevented: ${errorData.error}\n`)
      }
    }
    
    // Test 6: Create PO from suggestion (if suggestions exist)
    if (suggestionsData.suggestions?.length > 0) {
      console.log('6. Testing PO creation from suggestion...')
      const firstSuggestion = suggestionsData.suggestions[0]
      
      // Adjust quantities for first 2 items
      const adjustments = firstSuggestion.items.slice(0, 2).map(item => ({
        sku: item.sku,
        quantity: Math.ceil(item.quantity * 1.2) // Increase by 20%
      }))
      
      const suggestionResponse = await fetch(`${API_BASE}/api/purchase-orders/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion: firstSuggestion,
          adjustments: adjustments.length > 0 ? adjustments : undefined
        })
      })
      
      if (!suggestionResponse.ok) {
        const errorData = await suggestionResponse.json()
        console.log(`   ⚠ Could not create PO from suggestion: ${errorData.error}`)
      } else {
        const suggestionData = await suggestionResponse.json()
        console.log(`   ✓ Created PO from suggestion: ${suggestionData.purchase_order?.po_number}`)
        console.log(`   ✓ Vendor: ${suggestionData.purchase_order?.vendor_name}`)
        console.log(`   ✓ Items: ${suggestionData.purchase_order?.items?.length || 0}`)
        console.log(`   ✓ Total: $${suggestionData.purchase_order?.total_amount?.toFixed(2)}\n`)
      }
    }
    
    console.log('✅ All PO generation tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the tests
testPOGeneration()