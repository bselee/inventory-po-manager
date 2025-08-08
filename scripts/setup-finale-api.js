#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📦 BuildASoil Finale API Setup\n');
console.log('This will help you configure the Finale REST API for real-time data sync.\n');

const envPath = path.join(process.cwd(), '.env.local');

// Read existing env file
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.log('Creating new .env.local file...\n');
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('STEP 1: Get your Finale API Credentials');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('1. Open Finale in your browser:');
  console.log('   https://app.finaleinventory.com/buildasoilorganics\n');
  
  console.log('2. Navigate to: Settings → Integrations → API Access\n');
  
  console.log('3. Click "Generate New API Credentials" if you don\'t have them\n');
  
  console.log('4. Copy the API Key and API Secret\n');
  
  console.log('Press Enter when you have the credentials ready...');
  await question('');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 2: Enter Your Credentials');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const apiKey = await question('Enter your Finale API Key: ');
  const apiSecret = await question('Enter your Finale API Secret: ');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 3: Confirming Settings');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Update or add the credentials
  const credentials = [
    `FINALE_API_KEY=${apiKey}`,
    `FINALE_API_SECRET=${apiSecret}`,
    `FINALE_ACCOUNT_PATH=buildasoilorganics`,
    `FINALE_BASE_URL=https://app.finaleinventory.com`
  ];
  
  // Remove old FINALE_ entries and add new ones
  let lines = envContent.split('\n').filter(line => !line.startsWith('FINALE_API_') && !line.startsWith('FINALE_ACCOUNT_') && !line.startsWith('FINALE_BASE_'));
  lines = lines.concat(credentials);
  
  // Write back to file
  fs.writeFileSync(envPath, lines.join('\n'));
  
  console.log('✅ Finale API credentials saved to .env.local\n');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('STEP 4: Testing Connection');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('Testing your Finale API connection...\n');
  
  // Test the connection
  const { execSync } = require('child_process');
  try {
    execSync('npx tsx scripts/test-finale-simple.ts', { stdio: 'inherit' });
  } catch (e) {
    console.log('\n⚠️  Connection test failed. Please verify your credentials.\n');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('1. Start the development server:');
  console.log('   npm run dev\n');
  
  console.log('2. Navigate to Settings page:');
  console.log('   http://localhost:3000/settings\n');
  
  console.log('3. Click "Test Connection" to verify setup\n');
  
  console.log('4. Click "Manual Sync" to import your inventory data\n');
  
  console.log('5. Check your inventory page for real data:');
  console.log('   http://localhost:3000/inventory\n');
  
  rl.close();
}

setup().catch(console.error);