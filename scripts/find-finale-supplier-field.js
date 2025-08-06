#!/usr/bin/env node

/**
 * Find where Finale stores supplier/vendor data
 */

const https = require('https');
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
possibleFields.forEach(field => console.log(`  - ${field}`));
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
        // Check each sample product
        result.sampleProducts.forEach((product, index) => {
          // Check all fields in the product
          let foundSupplierField = false;
          
          Object.keys(product).forEach(fieldName => {
            // Check if this field name matches any supplier pattern
            const lowerField = fieldName.toLowerCase();
            if (lowerField.includes('supplier') || 
                lowerField.includes('vendor') || 
                lowerField.includes('manufacturer') ||
                lowerField.includes('party')) {
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
                  foundSupplierField = true;
                }
              });
            }
          });
          
          if (!foundSupplierField) {
          }
        });
        
        // Check column names from the analysis
        if (result.analysis && result.analysis.columnNames) {
          const columns = result.analysis.columnNames || [];
          columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('supplier') || 
                lowerCol.includes('vendor') || 
                lowerCol.includes('manufacturer') ||
                lowerCol.includes('party')) {
            } else {
            }
          });
        }
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