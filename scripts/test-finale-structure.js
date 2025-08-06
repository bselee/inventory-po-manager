#!/usr/bin/env node

/**
 * Comprehensive test script to understand Finale product data structure
 * This will help us identify where supplier/vendor data is stored
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';
// Wait for deployment
setTimeout(() => {
  // First, test the debug endpoint
  https.get(`${baseUrl}/api/debug-finale-raw`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.bodyPreview && result.bodyPreview !== 'undefined') {
          try {
            // Try to parse the Finale response
            const finaleData = JSON.parse(result.bodyPreview);
            if (Array.isArray(finaleData)) {
              if (finaleData.length > 0) {
                const product = finaleData[0];
                console.log('Available fields:', Object.keys(product).join(', '));
                
                // Check for supplier-related fields
                const supplierFields = [
                  'supplierList', 'supplier', 'suppliers', 'vendor', 'vendors',
                  'vendorName', 'vendorList', 'primarySupplier', 'primaryVendor',
                  'partyList', 'party', 'supplierName', 'primarySupplierName'
                ];
                
                supplierFields.forEach(field => {
                  if (field in product) {
                  }
                });
                
                // Show full structure of first product
                console.log(JSON.stringify(product, null, 2));
              }
            } else if (typeof finaleData === 'object') {
              console.log('\n📦 Response is an object (not array)');
              console.log('Keys:', Object.keys(finaleData).join(', '));
              
              // Check if it's the column format
              if (finaleData.productId && Array.isArray(finaleData.productId)) {
                console.log('Column names:', Object.keys(finaleData).join(', '));
                // Check for supplier columns
                const supplierColumns = Object.keys(finaleData).filter(key => 
                  key.toLowerCase().includes('supplier') || 
                  key.toLowerCase().includes('vendor') ||
                  key.toLowerCase().includes('party')
                );
                
                if (supplierColumns.length > 0) {
                  console.log('\n🏭 Found supplier-related columns:', supplierColumns.join(', '));
                  supplierColumns.forEach(col => {
                  });
                } else {
                }
              }
            }
          } catch (parseError) {
          }
        }
        
        // Now test inventory endpoint to see what's actually stored
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
                items.forEach((item, i) => {
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