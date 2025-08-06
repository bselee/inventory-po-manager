#!/usr/bin/env node

/**
 * Check for supplier1, supplier2, etc. fields in Finale products
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';
// Make request to test endpoint
https.get(`${baseUrl}/api/test-finale-product-structure`, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        const columns = result.analysis.columnNames;
        console.log(columns.join('\n'));
        // Check for supplier1, supplier2, vendor1, vendor2 patterns
        const patterns = [
          /supplier\d+/i,
          /vendor\d+/i,
          /party\d+/i,
          /manufacturer\d+/i,
          /supplier/i,
          /vendor/i,
          /party/i,
          /manufacturer/i
        ];
        
        const foundColumns = columns.filter(col => {
          return patterns.some(pattern => pattern.test(col));
        });
        
        if (foundColumns.length > 0) {
          foundColumns.forEach(col => console.log(`  - ${col}`));
        } else {
        }
        
        // Check if there are any columns containing numbers (like supplier1)
        const numberedColumns = columns.filter(col => /\d/.test(col));
        if (numberedColumns.length > 0) {
          numberedColumns.forEach(col => console.log(`  - ${col}`));
        } else {
        }
        
        // Check userFieldDataList which might contain custom fields
        if (result.firstProduct && result.firstProduct.userFieldDataList) {
          const userFields = result.firstProduct.userFieldDataList;
          if (userFields.length > 0) {
            userFields.forEach(field => {
            });
          } else {
          }
        }
        
      } else {
        console.error('❌ Error:', result.error);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});