#!/usr/bin/env node

/**
 * Check supplier data in Finale products
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';
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
        // Look at sample products to see supplier structure
        result.sampleProducts.forEach((product, index) => {
          if (product.supplierList) {
            if (Array.isArray(product.supplierList) && product.supplierList.length > 0) {
              product.supplierList.forEach((supplier, i) => {
                console.log(`    Supplier ${i + 1}:`, JSON.stringify(supplier, null, 2));
              });
            } else if (Array.isArray(product.supplierList) && product.supplierList.length === 0) {
            } else {
            }
          } else {
          }
        });
        
        // Now let's make a specific request to get products with suppliers
        // We need to analyze the raw Finale response to see supplier structure
        // The test endpoint shows 40% have supplierList data
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