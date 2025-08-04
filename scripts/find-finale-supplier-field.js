#!/usr/bin/env node

/**
 * Find where Finale stores supplier/vendor data
 */

const https = require('https');

console.log('🔍 Searching for supplier/vendor field in Finale data...\n');

// Check all possible field names where supplier data might be stored
const possibleFields = [
  'supplier1', 'supplier2', 'supplier3',
  'vendor1', 'vendor2', 'vendor3',
  'primarySupplier', 'primaryVendor',
  'supplierName', 'vendorName',
  'supplier', 'vendor',
  'manufacturerName', 'manufacturer',
  'supplierPartyName', 'vendorPartyName',
  'partyName', 'party',
  'source', 'sourceName'
];

console.log('Checking for these potential supplier fields:');
possibleFields.forEach(field => console.log(`  - ${field}`));
console.log('\n');

// Make a direct request to check raw Finale data structure
const baseUrl = 'https://inventory-po-manager.vercel.app';

https.get(`${baseUrl}/api/test-finale-deep-scan`, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success && result.sampleProducts) {
        console.log('📊 Analyzing sample products for supplier fields...\n');
        
        // Check each sample product
        result.sampleProducts.forEach((product, index) => {
          console.log(`Product ${index + 1}: ${product.productId}`);
          console.log(`  Name: ${product.internalName || 'N/A'}`);
          
          // Check all fields in the product
          let foundSupplierField = false;
          
          Object.keys(product).forEach(fieldName => {
            // Check if this field name matches any supplier pattern
            const lowerField = fieldName.toLowerCase();
            if (lowerField.includes('supplier') || 
                lowerField.includes('vendor') || 
                lowerField.includes('manufacturer') ||
                lowerField.includes('party')) {
              console.log(`  🔍 Found potential field: ${fieldName} = ${JSON.stringify(product[fieldName])}`);
              foundSupplierField = true;
            }
          });
          
          // Check nested objects
          Object.keys(product).forEach(fieldName => {
            const value = product[fieldName];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Check properties of nested objects
              Object.keys(value).forEach(nestedKey => {
                const lowerKey = nestedKey.toLowerCase();
                if (lowerKey.includes('supplier') || 
                    lowerKey.includes('vendor') || 
                    lowerKey.includes('manufacturer')) {
                  console.log(`  🔍 Found nested field: ${fieldName}.${nestedKey} = ${JSON.stringify(value[nestedKey])}`);
                  foundSupplierField = true;
                }
              });
            }
          });
          
          if (!foundSupplierField) {
            console.log('  ❌ No obvious supplier/vendor fields found');
          }
          
          console.log('');
        });
        
        // Check column names from the analysis
        if (result.analysis && result.analysis.columnNames) {
          console.log('📋 All available Finale columns:');
          const columns = result.analysis.columnNames || [];
          columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('supplier') || 
                lowerCol.includes('vendor') || 
                lowerCol.includes('manufacturer') ||
                lowerCol.includes('party')) {
              console.log(`  ✅ ${col}`);
            } else {
              console.log(`  - ${col}`);
            }
          });
        }
        
        console.log('\n💡 Next steps:');
        console.log('1. If supplier data exists in Finale but not in these fields,');
        console.log('   it might be in custom fields or require a different API endpoint');
        console.log('2. Check if the data needs to be fetched with expanded includes');
        console.log('3. Verify the Finale account has proper API permissions for supplier data');
        
      } else {
        console.error('Error getting sample data:', result.error);
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});