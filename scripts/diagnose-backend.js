#!/usr/bin/env node
/**
 * Backend Data Flow Diagnosis Script
 * Identifies and reports issues preventing data from flowing to frontend
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const issues = [];
const warnings = [];
const fixes = [];

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      issues.push({
        type: 'empty_file',
        file: filePath,
        description: `${description} is empty`
      });
      return false;
    }
    return true;
  } else {
    issues.push({
      type: 'missing_file',
      file: filePath,
      description: `${description} is missing`
    });
    return false;
  }
}

function checkEnvVar(varName, required = true) {
  if (!process.env[varName]) {
    if (required) {
      issues.push({
        type: 'missing_env',
        var: varName,
        description: `Required environment variable ${varName} is not set`
      });
    } else {
      warnings.push({
        type: 'missing_env',
        var: varName,
        description: `Optional environment variable ${varName} is not set`
      });
    }
    return false;
  }
  return true;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    return true;
  }
  return false;
}

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}           Backend Data Flow Diagnosis${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

// Load environment variables
console.log(`${colors.cyan}1. Checking Environment Configuration...${colors.reset}`);
const hasEnvFile = loadEnvFile();
if (!hasEnvFile) {
  issues.push({
    type: 'missing_file',
    file: '.env.local',
    description: 'Environment configuration file is missing'
  });
  fixes.push('Create .env.local from .env.local.example: cp .env.local.example .env.local');
}

// Check required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const finaleEnvVars = [
  'FINALE_API_KEY',
  'FINALE_API_SECRET',
  'FINALE_ACCOUNT_PATH'
];

const optionalEnvVars = [
  'REDIS_URL',
  'FINALE_INVENTORY_REPORT_URL',
  'SENDGRID_API_KEY'
];

requiredEnvVars.forEach(v => checkEnvVar(v, true));
finaleEnvVars.forEach(v => {
  if (!checkEnvVar(v, false)) {
    warnings.push({
      type: 'missing_finale',
      var: v,
      description: `Finale integration variable ${v} is not set - Finale sync will not work`
    });
  }
});
optionalEnvVars.forEach(v => checkEnvVar(v, false));

// Check critical files
console.log(`${colors.cyan}2. Checking Critical Files...${colors.reset}`);
const criticalFiles = [
  { path: 'app/lib/supabase.ts', desc: 'Supabase client' },
  { path: 'app/lib/finale-api.ts', desc: 'Finale API service' },
  { path: 'app/lib/redis-client.ts', desc: 'Redis client' },
  { path: 'app/lib/kv-inventory-service.ts', desc: 'KV inventory service' },
  { path: 'app/lib/kv-vendors-service.ts', desc: 'KV vendors service' },
  { path: 'app/lib/finale-report-api.ts', desc: 'Finale Report API' },
  { path: 'app/lib/logger.ts', desc: 'Logger utility' },
  { path: 'app/lib/errors.ts', desc: 'Error handling' }
];

criticalFiles.forEach(f => checkFile(f.path, f.desc));

// Check API routes
console.log(`${colors.cyan}3. Checking API Routes...${colors.reset}`);
const apiRoutes = [
  'app/api/inventory/route.ts',
  'app/api/purchase-orders/route.ts',
  'app/api/vendors/route.ts',
  'app/api/settings/route.ts'
];

apiRoutes.forEach(route => {
  if (checkFile(route, `API route ${route}`)) {
    const content = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
    
    // Check for common issues
    if (content.includes('logError') && !content.includes("import.*logError.*from.*['\"](.*logger|.*errors)")) {
      issues.push({
        type: 'missing_import',
        file: route,
        description: `Missing import for logError in ${route}`
      });
      fixes.push(`Add to ${route}: import { logError } from '@/app/lib/logger'`);
    }
    
    if (content.includes('logWarn') && !content.includes("import.*logWarn.*from.*['\"](.*logger)")) {
      issues.push({
        type: 'missing_import',
        file: route,
        description: `Missing import for logWarn in ${route}`
      });
      fixes.push(`Add to ${route}: import { logWarn } from '@/app/lib/logger'`);
    }
    
    if (!content.includes('export const runtime')) {
      warnings.push({
        type: 'missing_export',
        file: route,
        description: `Missing runtime export in ${route}`
      });
    }
  }
});

// Check build status
console.log(`${colors.cyan}4. Checking Build Status...${colors.reset}`);
const nextBuildDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextBuildDir)) {
  issues.push({
    type: 'no_build',
    description: 'Application has not been built'
  });
  fixes.push('Build the application: npm run build');
}

// Generate report
console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}                      DIAGNOSIS RESULTS${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

if (issues.length === 0 && warnings.length === 0) {
  console.log(`${colors.green}✅ No issues found! Backend configuration appears correct.${colors.reset}\n`);
} else {
  if (issues.length > 0) {
    console.log(`${colors.red}❌ Critical Issues (${issues.length}):${colors.reset}`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue.description}`);
      if (issue.file) console.log(`      File: ${issue.file}`);
      if (issue.var) console.log(`      Variable: ${issue.var}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  Warnings (${warnings.length}):${colors.reset}`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning.description}`);
      if (warning.file) console.log(`      File: ${warning.file}`);
      if (warning.var) console.log(`      Variable: ${warning.var}`);
    });
    console.log();
  }
}

if (fixes.length > 0) {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                    RECOMMENDED FIXES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  fixes.forEach((fix, i) => {
    console.log(`${colors.green}${i + 1}.${colors.reset} ${fix}`);
  });
  console.log();
}

// Data flow analysis
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}                   DATA FLOW STATUS${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

const hasSupabase = requiredEnvVars.every(v => process.env[v]);
const hasFinale = finaleEnvVars.every(v => process.env[v]);
const hasRedis = !!process.env.REDIS_URL;

console.log(`Database (Supabase): ${hasSupabase ? colors.green + '✓ Configured' : colors.red + '✗ Not configured'}${colors.reset}`);
console.log(`External API (Finale): ${hasFinale ? colors.green + '✓ Configured' : colors.yellow + '⚠ Not configured (using fallback)'}${colors.reset}`);
console.log(`Cache Layer (Redis): ${hasRedis ? colors.green + '✓ Configured' : colors.yellow + '⚠ Not configured (caching disabled)'}${colors.reset}`);

console.log(`\n${colors.cyan}Expected Data Flow:${colors.reset}`);
if (hasFinale && hasRedis) {
  console.log('  1. Frontend → API Route');
  console.log('  2. API Route → Redis Cache (check)');
  console.log('  3. If cache miss → Finale API');
  console.log('  4. Store in Redis → Return to Frontend');
} else if (hasFinale && !hasRedis) {
  console.log('  1. Frontend → API Route');
  console.log('  2. API Route → Finale API (no caching)');
  console.log('  3. Return to Frontend');
} else if (!hasFinale) {
  console.log('  1. Frontend → API Route');
  console.log('  2. API Route → Supabase Database');
  console.log('  3. Return to Frontend (or sample data)');
}

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}                      NEXT STEPS${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

if (issues.length > 0) {
  console.log(`1. Fix the critical issues listed above`);
  console.log(`2. Run: npm run build`);
  console.log(`3. Run: npm run dev`);
  console.log(`4. Test APIs: node scripts/test-api-health.js`);
} else if (!hasFinale) {
  console.log(`1. Configure Finale API credentials in .env.local`);
  console.log(`2. Run: npm run cache:clear && npm run cache:warm`);
  console.log(`3. Test APIs: node scripts/test-api-health.js`);
} else {
  console.log(`1. Start the development server: npm run dev`);
  console.log(`2. Test APIs: node scripts/test-api-health.js`);
  console.log(`3. Check browser console for frontend errors`);
}

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

process.exit(issues.length > 0 ? 1 : 0);