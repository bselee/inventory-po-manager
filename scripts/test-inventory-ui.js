// Test inventory UI is working
const http = require('http');

async function testInventoryUI() {
  console.log('=' .repeat(60));
  
  // 1. Test API endpoint
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.inventory && result.inventory.length > 0) {
            result.inventory.slice(0, 3).forEach((item, i) => {
            });
          }
        } catch (e) {
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('API Error:', err.message);
      resolve();
    });
  });
  
  // 2. Test inventory page
  await new Promise((resolve) => {
    http.get('http://localhost:3000/inventory', (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        // Check for key elements
        const hasTable = html.includes('<table') || html.includes('table');
        const hasSKU = html.includes('SKU') || html.includes('sku');
        const hasStock = html.includes('Stock') || html.includes('stock');
        const hasInventoryTitle = html.includes('Inventory') || html.includes('inventory');
        // Look for specific product SKUs
        const sampleSKUs = ['10001', '10002', 'BC101', 'WIDGET001'];
        sampleSKUs.forEach(sku => {
          if (html.includes(sku)) {
          }
        });
        
        // Check if it's a React app with client-side rendering
        if (html.includes('__next') && html.includes('_next/static')) {
        }
        
        resolve();
      });
    }).on('error', (err) => {
      console.error('Page Error:', err.message);
      resolve();
    });
  });
}

testInventoryUI().catch(console.error);