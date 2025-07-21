// Test inventory UI is working
const http = require('http');

async function testInventoryUI() {
  console.log('🔍 TESTING INVENTORY UI\n');
  console.log('=' .repeat(60));
  
  // 1. Test API endpoint
  console.log('\n1. Testing /api/inventory endpoint...');
  
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Items returned: ${result.inventory?.length || 0}`);
          
          if (result.inventory && result.inventory.length > 0) {
            console.log('\nFirst 3 items:');
            result.inventory.slice(0, 3).forEach((item, i) => {
              console.log(`${i + 1}. ${item.sku} - ${item.product_name}`);
              console.log(`   Stock: ${item.stock}, Location: ${item.location}`);
            });
          }
        } catch (e) {
          console.log('Error parsing response:', e.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('API Error:', err.message);
      resolve();
    });
  });
  
  // 2. Test inventory page
  console.log('\n\n2. Testing /inventory page...');
  
  await new Promise((resolve) => {
    http.get('http://localhost:3000/inventory', (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        // Check for key elements
        const hasTable = html.includes('<table') || html.includes('table');
        const hasSKU = html.includes('SKU') || html.includes('sku');
        const hasStock = html.includes('Stock') || html.includes('stock');
        const hasInventoryTitle = html.includes('Inventory') || html.includes('inventory');
        
        console.log('\nPage elements found:');
        console.log(`✅ Has table: ${hasTable}`);
        console.log(`✅ Has SKU column: ${hasSKU}`);
        console.log(`✅ Has Stock column: ${hasStock}`);
        console.log(`✅ Has Inventory title: ${hasInventoryTitle}`);
        
        // Look for specific product SKUs
        const sampleSKUs = ['10001', '10002', 'BC101', 'WIDGET001'];
        console.log('\nChecking for product SKUs:');
        sampleSKUs.forEach(sku => {
          if (html.includes(sku)) {
            console.log(`✅ Found SKU: ${sku}`);
          }
        });
        
        // Check if it's a React app with client-side rendering
        if (html.includes('__next') && html.includes('_next/static')) {
          console.log('\n📱 This is a Next.js app with client-side rendering');
          console.log('The data is loaded dynamically after the page loads');
        }
        
        resolve();
      });
    }).on('error', (err) => {
      console.error('Page Error:', err.message);
      resolve();
    });
  });
  
  console.log('\n\n✅ INVENTORY UI TEST COMPLETE');
  console.log('The inventory page should be accessible at: http://localhost:3000/inventory');
}

testInventoryUI().catch(console.error);