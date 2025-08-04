#!/usr/bin/env node

/**
 * Check for supplier1, supplier2, etc. fields in Finale products
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Checking for supplier1/supplier2 fields in Finale products...');
console.log(`📍 Using URL: ${baseUrl}\n`);

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
        console.log('📋 All Finale columns:');
        console.log(columns.join('\n'));
        
        console.log('\n🔍 Checking for supplier-related columns:');
        
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
          console.log('\n✅ Found potential supplier columns:');
          foundColumns.forEach(col => console.log(`  - ${col}`));
        } else {
          console.log('\n❌ No supplier/vendor columns found with common patterns');
        }
        
        // Check if there are any columns containing numbers (like supplier1)
        console.log('\n🔢 Columns containing numbers:');
        const numberedColumns = columns.filter(col => /\d/.test(col));
        if (numberedColumns.length > 0) {
          numberedColumns.forEach(col => console.log(`  - ${col}`));
        } else {
          console.log('  None found');
        }
        
        // Check userFieldDataList which might contain custom fields
        if (result.firstProduct && result.firstProduct.userFieldDataList) {
          console.log('\n📝 User-defined fields:');
          const userFields = result.firstProduct.userFieldDataList;
          if (userFields.length > 0) {
            userFields.forEach(field => {
              console.log(`  - ${field.attrName}: ${field.attrValue}`);
            });
          } else {
            console.log('  None found');
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