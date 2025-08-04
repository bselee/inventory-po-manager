#!/usr/bin/env node

/**
 * Comprehensive test script to understand Finale product data structure
 * This will help us identify where supplier/vendor data is stored
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Testing Finale product data structure...');
console.log(`📍 Using URL: ${baseUrl}`);
console.log('⏳ Waiting 30 seconds for deployment to complete...\n');

// Wait for deployment
setTimeout(() => {
  // First, test the debug endpoint
  console.log('1️⃣ Testing debug-finale-raw endpoint...');
  
  https.get(`${baseUrl}/api/debug-finale-raw`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('\n📊 Debug endpoint response:');
        console.log(`Status: ${result.status}`);
        console.log(`Body length: ${result.bodyLength}`);
        console.log(`Body preview: ${result.bodyPreview?.substring(0, 100)}...`);
        
        if (result.bodyPreview && result.bodyPreview !== 'undefined') {
          try {
            // Try to parse the Finale response
            const finaleData = JSON.parse(result.bodyPreview);
            console.log('\n✅ Successfully parsed Finale response!');
            
            if (Array.isArray(finaleData)) {
              console.log(`\n📦 Found ${finaleData.length} products`);
              
              if (finaleData.length > 0) {
                const product = finaleData[0];
                console.log('\n🔍 First product structure:');
                console.log('Available fields:', Object.keys(product).join(', '));
                
                // Check for supplier-related fields
                console.log('\n🏭 Supplier-related fields:');
                const supplierFields = [
                  'supplierList', 'supplier', 'suppliers', 'vendor', 'vendors',
                  'vendorName', 'vendorList', 'primarySupplier', 'primaryVendor',
                  'partyList', 'party', 'supplierName', 'primarySupplierName'
                ];
                
                supplierFields.forEach(field => {
                  if (field in product) {
                    console.log(`  ✅ ${field}: ${JSON.stringify(product[field])}`);
                  }
                });
                
                // Show full structure of first product
                console.log('\n📄 Full first product data:');
                console.log(JSON.stringify(product, null, 2));
              }
            } else if (typeof finaleData === 'object') {
              console.log('\n📦 Response is an object (not array)');
              console.log('Keys:', Object.keys(finaleData).join(', '));
              
              // Check if it's the column format
              if (finaleData.productId && Array.isArray(finaleData.productId)) {
                console.log('\n✅ Detected column format response!');
                console.log('Column names:', Object.keys(finaleData).join(', '));
                console.log(`Number of products: ${finaleData.productId.length}`);
                
                // Check for supplier columns
                const supplierColumns = Object.keys(finaleData).filter(key => 
                  key.toLowerCase().includes('supplier') || 
                  key.toLowerCase().includes('vendor') ||
                  key.toLowerCase().includes('party')
                );
                
                if (supplierColumns.length > 0) {
                  console.log('\n🏭 Found supplier-related columns:', supplierColumns.join(', '));
                  supplierColumns.forEach(col => {
                    console.log(`  ${col}: First value = ${finaleData[col]?.[0]}`);
                  });
                } else {
                  console.log('\n⚠️ No supplier-related columns found');
                }
              }
            }
          } catch (parseError) {
            console.log('\n⚠️ Could not parse as JSON:', parseError.message);
          }
        }
        
        // Now test inventory endpoint to see what's actually stored
        console.log('\n\n2️⃣ Checking current inventory data...');
        
        https.get(`${baseUrl}/api/inventory?limit=3`, (invRes) => {
          let invData = '';
          
          invRes.on('data', (chunk) => {
            invData += chunk;
          });
          
          invRes.on('end', () => {
            try {
              const inventory = JSON.parse(invData);
              
              if (inventory.data?.inventory) {
                const items = inventory.data.inventory;
                console.log(`\n📦 Sample inventory items (${items.length} shown):`);
                
                items.forEach((item, i) => {
                  console.log(`\nItem ${i + 1}:`);
                  console.log(`  SKU: ${item.sku}`);
                  console.log(`  Vendor field: "${item.vendor || ''}" (${item.vendor ? 'HAS DATA' : 'EMPTY'})`);
                  
                  // Check all fields that might contain vendor data
                  const vendorFields = Object.keys(item).filter(key => 
                    key.toLowerCase().includes('vendor') || 
                    key.toLowerCase().includes('supplier')
                  );
                  
                  if (vendorFields.length > 1) {
                    console.log('  Other vendor fields:', vendorFields.join(', '));
                  }
                });
              }
            } catch (e) {
              console.error('Failed to parse inventory response:', e.message);
            }
          });
        }).on('error', (err) => {
          console.error('Failed to fetch inventory:', err.message);
        });
        
      } catch (e) {
        console.error('❌ Failed to parse debug response:', e.message);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Failed to fetch debug data:', err.message);
  });
}, 30000); // 30 second delay