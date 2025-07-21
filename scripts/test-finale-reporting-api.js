// Test Finale Reporting API for inventory data
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function testReportingAPI() {
  console.log('🔍 TESTING FINALE REPORTING API\n');
  
  // Common inventory reports that might exist
  const reportTests = [
    // Try stock status report
    { 
      name: 'Stock Status Report',
      path: '/reportapi/report?reportName=stock_status&format=json'
    },
    {
      name: 'Inventory Summary',
      path: '/reportapi/report?reportName=inventory_summary&format=json'
    },
    {
      name: 'Product List with Stock',
      path: '/reportapi/report?reportName=product_list&includeInventory=true&format=json'
    },
    // Try the main reporting endpoint
    {
      name: 'Report List',
      path: '/reportapi/report'
    },
    // Try specific report formats
    {
      name: 'Stock on Hand Report',
      path: '/reportapi/stock_on_hand?format=json'
    }
  ];
  
  for (const test of reportTests) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log(`Path: ${test.path}`);
    console.log('-'.repeat(50));
    
    const url = `https://app.finaleinventory.com/${accountPath}/api${test.path}`;
    
    await new Promise((resolve) => {
      https.get(url, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        console.log('Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Success!');
            try {
              const parsed = JSON.parse(data);
              console.log('Response type:', typeof parsed);
              
              if (Array.isArray(parsed)) {
                console.log('Array length:', parsed.length);
                if (parsed.length > 0) {
                  console.log('First item:', JSON.stringify(parsed[0], null, 2).substring(0, 300));
                }
              } else if (typeof parsed === 'object') {
                console.log('Object keys:', Object.keys(parsed).slice(0, 20));
                console.log('Sample:', JSON.stringify(parsed, null, 2).substring(0, 500));
              }
            } catch (e) {
              console.log('Response preview:', data.substring(0, 300));
            }
          } else {
            console.log('❌ Failed');
            console.log('Response:', data.substring(0, 200));
          }
          resolve();
        });
      }).on('error', (err) => {
        console.log('❌ Error:', err.message);
        resolve();
      });
    });
  }
  
  // Also try to access reports through the UI endpoint
  console.log('\n\n📈 CHECKING FOR STANDARD REPORTS');
  console.log('=' .repeat(50));
  
  // These are common report IDs in Finale
  const standardReports = [
    'inventory_valuation',
    'stock_status',
    'reorder_report',
    'low_stock',
    'product_master'
  ];
  
  for (const reportId of standardReports) {
    console.log(`\nTrying report ID: ${reportId}`);
    
    const reportUrl = `https://app.finaleinventory.com/${accountPath}/api/report/${reportId}?format=json`;
    
    await new Promise((resolve) => {
      https.get(reportUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        console.log('Status:', res.statusCode);
        
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            console.log('✅ Found report!');
            console.log('Preview:', data.substring(0, 200));
            resolve();
          });
        } else {
          res.on('data', () => {}); // Consume response
          res.on('end', () => resolve());
        }
      }).on('error', () => resolve());
    });
  }
}

// Run the test
testReportingAPI().catch(console.error);