#!/usr/bin/env node

/**
 * Check supplier data in Finale products
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Checking supplier data in Finale products...');

// Direct API call to get raw product data
const authHeader = process.env.FINALE_AUTH || '';
const accountPath = 'buildasoilorganics'; // from the URL we saw

const url = `https://app.finaleinventory.com/${accountPath}/api/product?limit=50`;

// First try the test endpoint
https.get(`${baseUrl}/api/test-finale-deep-scan`, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('\n📊 Supplier Data Analysis:');
        console.log(`Total products scanned: ${result.analysis.totalProducts}`);
        console.log(`Products with supplierList: ${result.analysis.columnsWithData.supplierList?.count || 0} (${result.analysis.columnsWithData.supplierList?.percentage || '0%'})`);
        
        // Look at sample products to see supplier structure
        console.log('\n📦 Analyzing sample products for supplier data:');
        result.sampleProducts.forEach((product, index) => {
          console.log(`\nProduct ${index + 1}: ${product.productId}`);
          console.log(`  Name: ${product.internalName}`);
          
          if (product.supplierList) {
            if (Array.isArray(product.supplierList) && product.supplierList.length > 0) {
              console.log(`  ✅ Has ${product.supplierList.length} supplier(s):`);
              product.supplierList.forEach((supplier, i) => {
                console.log(`    Supplier ${i + 1}:`, JSON.stringify(supplier, null, 2));
              });
            } else if (Array.isArray(product.supplierList) && product.supplierList.length === 0) {
              console.log('  ❌ Empty supplier list');
            } else {
              console.log('  ⚠️ Supplier list is not an array:', product.supplierList);
            }
          } else {
            console.log('  ❌ No supplierList field');
          }
        });
        
        // Now let's make a specific request to get products with suppliers
        console.log('\n🔄 Fetching more products to find ones with suppliers...');
        
        // We need to analyze the raw Finale response to see supplier structure
        // The test endpoint shows 40% have supplierList data
        console.log('\n💡 Note: 40% of products have supplierList data, but it might still be empty arrays.');
        console.log('   We need to check if those supplierLists actually contain supplier objects.');
        
      } else {
        console.error('Error:', result.error);
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});