#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n📦 Quick Finale API Setup\n');

// You need to get these from Finale:
// 1. Go to: https://app.finaleinventory.com/buildasoilorganics
// 2. Navigate to: Settings → Integrations → API Access
// 3. Generate or copy your credentials

const INSTRUCTIONS = `
═══════════════════════════════════════════════════════════════
MANUAL SETUP REQUIRED
═══════════════════════════════════════════════════════════════

Since we can't do interactive input, you need to manually add 
your Finale API credentials.

STEP 1: Get your credentials from Finale
----------------------------------------
1. Open: https://app.finaleinventory.com/buildasoilorganics
2. Go to: Settings → Integrations → API Access
3. Click "Generate New API Credentials" if needed
4. Copy the API Key and API Secret

STEP 2: Add to .env.local file
-------------------------------
Add these lines to your .env.local file:

FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=buildasoilorganics
FINALE_BASE_URL=https://app.finaleinventory.com

STEP 3: Test the connection
----------------------------
After adding credentials, run:
npx tsx scripts/test-finale-simple.ts

STEP 4: Sync your data
----------------------
Go to: http://localhost:3000/settings
Click "Test Connection" then "Manual Sync"

═══════════════════════════════════════════════════════════════
`;

console.log(INSTRUCTIONS);

// Create a template .env.local.example if it doesn't exist
const envExample = `# Finale API Credentials
# Get these from: https://app.finaleinventory.com/buildasoilorganics
# Navigate to: Settings → Integrations → API Access

FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=buildasoilorganics
FINALE_BASE_URL=https://app.finaleinventory.com

# Existing variables (keep these)
${fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split('\n').filter(line => !line.startsWith('FINALE_')).join('\n') : ''}
`;

fs.writeFileSync('.env.local.example', envExample);
console.log('✅ Created .env.local.example template\n');
console.log('📝 You can copy this template:\n');
console.log('   cp .env.local.example .env.local\n');
console.log('Then edit .env.local and replace the placeholder values.\n');