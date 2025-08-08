#!/usr/bin/env node

/**
 * Setup Finale Report URLs
 * 
 * This script helps generate the proper Finale Report URLs needed for the application.
 * Based on Finale API documentation patterns.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n📊 Finale Report URL Setup Helper\n');
  console.log('This will help you generate the correct Report URLs for your Finale integration.\n');
  
  // Get account path
  const accountPath = await question('Enter your Finale account path (e.g., buildasoilorganics): ');
  
  console.log('\n📋 Available Report Types:\n');
  console.log('1. Inventory Report (products with stock levels)');
  console.log('2. Vendor/Supplier Report');
  console.log('3. Custom Report\n');
  
  const reportChoice = await question('Which type of report do you want to set up? (1/2/3): ');
  
  let reportName = '';
  let reportUrl = '';
  
  if (reportChoice === '1') {
    // Inventory Report
    console.log('\n📦 Setting up Inventory Report URL...\n');
    console.log('Common inventory report names in Finale:');
    console.log('- inventoryReport');
    console.log('- productList');
    console.log('- stockStatus');
    console.log('- inventoryBySupplier\n');
    
    reportName = await question('Enter your inventory report name (or press Enter for "inventoryReport"): ') || 'inventoryReport';
    
    // Build the URL
    reportUrl = `https://app.finaleinventory.com/${accountPath}/doc/report/${reportName}.json?format=jsonObject`;
    
    // Ask about filters
    const addFilters = await question('\nDo you want to add filters? (y/n): ');
    
    if (addFilters.toLowerCase() === 'y') {
      console.log('\nCommon filters for inventory:');
      console.log('- year: 2024 (current year)');
      console.log('- status: "active"');
      console.log('- location: "warehouse-1"');
      console.log('- supplier: "vendor-name"\n');
      
      const filterJson = await question('Enter filters as JSON (e.g., {"year": 2024}): ');
      
      try {
        const filters = JSON.parse(filterJson);
        const encodedFilters = Buffer.from(JSON.stringify(filters)).toString('base64');
        reportUrl += `&filters=${encodedFilters}`;
      } catch (e) {
        console.log('Invalid JSON, skipping filters');
      }
    }
    
    console.log('\n✅ Inventory Report URL:');
    console.log(`FINALE_INVENTORY_REPORT_URL=${reportUrl}`);
    
  } else if (reportChoice === '2') {
    // Vendor Report
    console.log('\n👥 Setting up Vendor Report URL...\n');
    console.log('Common vendor report names in Finale:');
    console.log('- vendorList');
    console.log('- supplierReport');
    console.log('- vendorContacts\n');
    
    reportName = await question('Enter your vendor report name (or press Enter for "vendorList"): ') || 'vendorList';
    
    reportUrl = `https://app.finaleinventory.com/${accountPath}/doc/report/${reportName}.json?format=jsonObject`;
    
    console.log('\n✅ Vendor Report URL:');
    console.log(`FINALE_VENDORS_REPORT_URL=${reportUrl}`);
    
  } else if (reportChoice === '3') {
    // Custom Report
    console.log('\n🔧 Setting up Custom Report URL...\n');
    reportName = await question('Enter your custom report name: ');
    
    reportUrl = `https://app.finaleinventory.com/${accountPath}/doc/report/${reportName}.json?format=jsonObject`;
    
    console.log('\n✅ Custom Report URL:');
    console.log(`CUSTOM_REPORT_URL=${reportUrl}`);
  }
  
  // Generate example .env entries
  console.log('\n📝 Add these to your .env.local file:\n');
  console.log('# Finale API Credentials');
  console.log('FINALE_API_KEY=your_api_key_here');
  console.log('FINALE_API_SECRET=your_api_secret_here');
  console.log(`FINALE_ACCOUNT_PATH=${accountPath}`);
  console.log('\n# Finale Report URLs');
  
  if (reportChoice === '1') {
    console.log(`FINALE_INVENTORY_REPORT_URL=${reportUrl}`);
    console.log('FINALE_VENDORS_REPORT_URL=# Add vendor report URL here');
  } else if (reportChoice === '2') {
    console.log('FINALE_INVENTORY_REPORT_URL=# Add inventory report URL here');
    console.log(`FINALE_VENDORS_REPORT_URL=${reportUrl}`);
  } else {
    console.log(`CUSTOM_REPORT_URL=${reportUrl}`);
  }
  
  console.log('\n# Redis Configuration');
  console.log('REDIS_URL=redis://your-redis-url-here');
  
  // Test URL construction
  console.log('\n🧪 Testing URL format...\n');
  console.log('Your report URL follows the pattern:');
  console.log(`Base: https://app.finaleinventory.com/${accountPath}/doc/report/`);
  console.log(`Report: ${reportName}.json`);
  console.log('Format: ?format=jsonObject');
  
  console.log('\n📚 Next Steps:');
  console.log('1. Log into Finale and verify the report exists');
  console.log('2. Add the environment variables to your .env.local');
  console.log('3. Test the connection with: npm run test:finale');
  console.log('4. Run initial sync with: curl -X POST http://localhost:3000/api/sync-finale/trigger');
  
  // Ask if they want to save to file
  const saveToFile = await question('\nSave these settings to .env.example? (y/n): ');
  
  if (saveToFile.toLowerCase() === 'y') {
    const envContent = `# Finale API Configuration
FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=${accountPath}

# Finale Report URLs
${reportChoice === '1' ? `FINALE_INVENTORY_REPORT_URL=${reportUrl}` : 'FINALE_INVENTORY_REPORT_URL='}
${reportChoice === '2' ? `FINALE_VENDORS_REPORT_URL=${reportUrl}` : 'FINALE_VENDORS_REPORT_URL='}

# Redis Configuration
REDIS_URL=redis://your-redis-url-here
`;
    
    fs.writeFileSync(path.join(process.cwd(), '.env.example'), envContent);
    console.log('\n✅ Saved to .env.example');
  }
  
  rl.close();
}

main().catch(console.error);