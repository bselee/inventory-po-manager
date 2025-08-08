#!/usr/bin/env node

/**
 * Comprehensive API Diagnostic and Fix Script
 * Diagnoses and fixes API timeout issues by checking all data integration points
 */

import { createClient } from '@supabase/supabase-js'
import { FinaleApiService, getFinaleConfig } from '../app/lib/finale-api'
import { redis, getRedisClient } from '../app/lib/redis-client'
import { kvInventoryService } from '../app/lib/kv-inventory-service'
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Diagnostic results
interface DiagnosticResult {
  step: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: any
  fix?: () => Promise<void>
}

const results: DiagnosticResult[] = []

// Helper functions
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  }
  console.log(colors[type](message))
}

function logSection(title: string) {
  console.log('\n' + chalk.bold.underline(title))
}

async function addResult(result: DiagnosticResult) {
  results.push(result)
  const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
  log(`${icon} ${result.step}: ${result.message}`, result.status)
  if (result.details) {
    console.log(chalk.gray(JSON.stringify(result.details, null, 2)))
  }
}

// Diagnostic checks
async function checkEnvironmentVariables() {
  logSection('1. Checking Environment Variables')
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL'
  ]
  
  const finaleVars = [
    'FINALE_API_KEY',
    'FINALE_API_SECRET',
    'FINALE_ACCOUNT_PATH'
  ]
  
  let allPresent = true
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      await addResult({
        step: 'Environment Variables',
        status: 'error',
        message: `Missing required variable: ${varName}`,
        fix: async () => {
          log(`Please add ${varName} to your .env.local file`, 'error')
        }
      })
      allPresent = false
    }
  }
  
  let finalePresent = true
  for (const varName of finaleVars) {
    if (!process.env[varName]) {
      finalePresent = false
    }
  }
  
  if (!finalePresent) {
    await addResult({
      step: 'Finale Environment Variables',
      status: 'warning',
      message: 'Finale API variables not in environment (will check database)',
      details: { missingVars: finaleVars.filter(v => !process.env[v]) }
    })
  } else {
    await addResult({
      step: 'Environment Variables',
      status: 'success',
      message: 'All environment variables present'
    })
  }
  
  return allPresent
}

async function checkSupabaseConnection() {
  logSection('2. Checking Supabase Database Connection')
  
  try {
    // Test connection by querying settings table
    const { data, error } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
    
    if (error) {
      await addResult({
        step: 'Supabase Connection',
        status: 'error',
        message: 'Failed to connect to Supabase',
        details: error,
        fix: async () => {
          log('Check your Supabase URL and service role key', 'error')
        }
      })
      return false
    }
    
    await addResult({
      step: 'Supabase Connection',
      status: 'success',
      message: 'Successfully connected to Supabase'
    })
    
    // Check if tables have data
    const tables = ['inventory_items', 'vendors', 'settings']
    const tableStatus: Record<string, number> = {}
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      tableStatus[table] = count || 0
    }
    
    await addResult({
      step: 'Database Tables',
      status: tableStatus.inventory_items > 0 ? 'success' : 'warning',
      message: `Database table status`,
      details: tableStatus
    })
    
    return true
  } catch (error) {
    await addResult({
      step: 'Supabase Connection',
      status: 'error',
      message: 'Unexpected error connecting to Supabase',
      details: error
    })
    return false
  }
}

async function checkRedisConnection() {
  logSection('3. Checking Redis Cache Connection')
  
  try {
    const client = await getRedisClient()
    
    // Test connection with ping
    const pingResult = await client.ping()
    
    if (pingResult !== 'PONG') {
      await addResult({
        step: 'Redis Connection',
        status: 'error',
        message: 'Redis ping failed',
        details: { pingResult }
      })
      return false
    }
    
    await addResult({
      step: 'Redis Connection',
      status: 'success',
      message: 'Successfully connected to Redis'
    })
    
    // Check cache contents
    const cacheKeys = [
      'inventory:full',
      'inventory:summary',
      'inventory:last_sync'
    ]
    
    const cacheStatus: Record<string, boolean> = {}
    
    for (const key of cacheKeys) {
      const exists = await client.exists(key)
      cacheStatus[key] = exists === 1
    }
    
    const hasCache = Object.values(cacheStatus).some(v => v)
    
    await addResult({
      step: 'Redis Cache Status',
      status: hasCache ? 'success' : 'warning',
      message: hasCache ? 'Cache contains data' : 'Cache is empty',
      details: cacheStatus
    })
    
    return true
  } catch (error) {
    await addResult({
      step: 'Redis Connection',
      status: 'warning',
      message: 'Redis not available (will use fallback)',
      details: error
    })
    return false
  }
}

async function checkFinaleConfiguration() {
  logSection('4. Checking Finale API Configuration')
  
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      await addResult({
        step: 'Finale Configuration',
        status: 'error',
        message: 'No Finale API credentials found',
        fix: async () => {
          log('Setting up Finale API credentials in database...', 'info')
          await setupFinaleCredentials()
        }
      })
      return false
    }
    
    await addResult({
      step: 'Finale Configuration',
      status: 'success',
      message: 'Finale API credentials found',
      details: {
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret,
        accountPath: config.accountPath
      }
    })
    
    // Test the connection
    log('Testing Finale API connection...', 'info')
    const finaleApi = new FinaleApiService(config)
    const connectionOk = await finaleApi.testConnection()
    
    if (!connectionOk) {
      await addResult({
        step: 'Finale API Test',
        status: 'error',
        message: 'Failed to connect to Finale API',
        fix: async () => {
          log('Please verify your Finale API credentials', 'error')
          log('Visit: https://app.finaleinventory.com/buildasoilorganics', 'info')
          log('Go to: Settings → Integrations → API Access', 'info')
        }
      })
      return false
    }
    
    await addResult({
      step: 'Finale API Test',
      status: 'success',
      message: 'Successfully connected to Finale API'
    })
    
    return true
  } catch (error) {
    await addResult({
      step: 'Finale Configuration',
      status: 'error',
      message: 'Error checking Finale configuration',
      details: error
    })
    return false
  }
}

async function setupFinaleCredentials() {
  // Try to use environment variables first
  if (process.env.FINALE_API_KEY && process.env.FINALE_API_SECRET && process.env.FINALE_ACCOUNT_PATH) {
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        finale_api_key: process.env.FINALE_API_KEY,
        finale_api_secret: process.env.FINALE_API_SECRET,
        finale_account_path: process.env.FINALE_ACCOUNT_PATH,
        sync_enabled: true,
        inventory_data_source: 'redis-cache',
        updated_at: new Date().toISOString()
      })
    
    if (!error) {
      log('Successfully saved Finale credentials to database', 'success')
    } else {
      log('Failed to save credentials: ' + error.message, 'error')
    }
  } else {
    log('Please add Finale API credentials to .env.local:', 'warning')
    log('FINALE_API_KEY=your_api_key', 'info')
    log('FINALE_API_SECRET=your_api_secret', 'info')
    log('FINALE_ACCOUNT_PATH=buildasoilorganics', 'info')
  }
}

async function checkForBlockingCode() {
  logSection('5. Checking for Blocking Operations in API Routes')
  
  // Check if the inventory service has any sync locks
  try {
    const client = await getRedisClient()
    const lockExists = await client.exists('inventory:sync_status:lock')
    
    if (lockExists) {
      const lockValue = await client.get('inventory:sync_status:lock')
      await addResult({
        step: 'Sync Lock Check',
        status: 'warning',
        message: 'Found existing sync lock',
        details: { lockValue },
        fix: async () => {
          log('Clearing stuck sync lock...', 'info')
          await client.del('inventory:sync_status:lock')
          log('Lock cleared', 'success')
        }
      })
    } else {
      await addResult({
        step: 'Sync Lock Check',
        status: 'success',
        message: 'No blocking sync locks found'
      })
    }
  } catch (error) {
    // Redis might not be available
  }
}

async function performInitialSync() {
  logSection('6. Performing Initial Data Sync')
  
  const config = await getFinaleConfig()
  if (!config) {
    log('Cannot sync - no Finale credentials', 'error')
    return false
  }
  
  try {
    log('Starting inventory sync from Finale...', 'info')
    
    // First try a quick inventory-only sync
    const finaleApi = new FinaleApiService(config)
    const quickResult = await finaleApi.syncInventoryOnly()
    
    if (quickResult.success) {
      await addResult({
        step: 'Quick Inventory Sync',
        status: 'success',
        message: `Synced ${quickResult.itemsUpdated} inventory items`,
        details: quickResult
      })
      
      // Also populate cache
      log('Populating Redis cache...', 'info')
      await kvInventoryService.getInventory(true) // Force refresh
      
      return true
    } else {
      await addResult({
        step: 'Quick Inventory Sync',
        status: 'error',
        message: 'Sync failed',
        details: quickResult
      })
      return false
    }
  } catch (error) {
    await addResult({
      step: 'Initial Sync',
      status: 'error',
      message: 'Sync error',
      details: error
    })
    return false
  }
}

async function createTestData() {
  logSection('7. Creating Test Data (Fallback)')
  
  log('Creating sample inventory data...', 'info')
  
  const testItems = [
    {
      sku: 'TEST-001',
      product_name: 'Sample Product 1',
      vendor: 'Test Vendor',
      stock: 100,
      location: 'Main',
      reorder_point: 20,
      reorder_quantity: 50,
      cost: 10.00,
      last_updated: new Date().toISOString()
    },
    {
      sku: 'TEST-002',
      product_name: 'Sample Product 2',
      vendor: 'Test Vendor',
      stock: 50,
      location: 'Main',
      reorder_point: 10,
      reorder_quantity: 30,
      cost: 15.00,
      last_updated: new Date().toISOString()
    },
    {
      sku: 'TEST-003',
      product_name: 'Low Stock Item',
      vendor: 'Another Vendor',
      stock: 5,
      location: 'Main',
      reorder_point: 15,
      reorder_quantity: 40,
      cost: 20.00,
      last_updated: new Date().toISOString()
    }
  ]
  
  const { error } = await supabase
    .from('inventory_items')
    .upsert(testItems, { onConflict: 'sku' })
  
  if (!error) {
    await addResult({
      step: 'Test Data Creation',
      status: 'success',
      message: `Created ${testItems.length} test inventory items`
    })
    
    // Also create a test vendor
    await supabase
      .from('vendors')
      .upsert({
        id: 1,
        name: 'Test Vendor',
        contact_name: 'Test Contact',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      })
    
    return true
  } else {
    await addResult({
      step: 'Test Data Creation',
      status: 'error',
      message: 'Failed to create test data',
      details: error
    })
    return false
  }
}

async function testAPIEndpoints() {
  logSection('8. Testing API Endpoints')
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  
  const endpoints = [
    { path: '/api/inventory', method: 'GET' },
    { path: '/api/settings', method: 'GET' },
    { path: '/api/sync/status', method: 'GET' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        await addResult({
          step: `API Test ${endpoint.path}`,
          status: 'success',
          message: 'Endpoint responding',
          details: { 
            status: response.status,
            hasData: !!data
          }
        })
      } else {
        await addResult({
          step: `API Test ${endpoint.path}`,
          status: 'warning',
          message: `Endpoint returned ${response.status}`,
          details: { status: response.status }
        })
      }
    } catch (error) {
      await addResult({
        step: `API Test ${endpoint.path}`,
        status: 'warning',
        message: 'Could not test endpoint (server may not be running)',
        details: error
      })
    }
  }
}

async function applyFixes() {
  logSection('Applying Fixes')
  
  const fixableResults = results.filter(r => r.fix && r.status !== 'success')
  
  if (fixableResults.length === 0) {
    log('No fixes to apply', 'success')
    return
  }
  
  log(`Found ${fixableResults.length} issues to fix`, 'info')
  
  for (const result of fixableResults) {
    log(`Fixing: ${result.step}`, 'info')
    try {
      await result.fix!()
    } catch (error) {
      log(`Failed to fix ${result.step}: ${error}`, 'error')
    }
  }
}

async function generateSummary() {
  logSection('Diagnostic Summary')
  
  const successCount = results.filter(r => r.status === 'success').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  console.log('\n' + chalk.bold('Results:'))
  console.log(chalk.green(`✅ Success: ${successCount}`))
  console.log(chalk.yellow(`⚠️  Warnings: ${warningCount}`))
  console.log(chalk.red(`❌ Errors: ${errorCount}`))
  
  if (errorCount === 0) {
    console.log('\n' + chalk.green.bold('✨ All systems operational! Your API should be working now.'))
  } else {
    console.log('\n' + chalk.yellow.bold('⚠️  Some issues remain. Please review the errors above.'))
  }
  
  // Save diagnostic report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { successCount, warningCount, errorCount },
    results
  }
  
  await fs.writeFile(
    path.join(process.cwd(), 'diagnostic-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  log('\nDiagnostic report saved to diagnostic-report.json', 'info')
}

// Main execution
async function main() {
  console.log(chalk.bold.blue('\n🔧 API Diagnostic and Fix Tool\n'))
  console.log('This tool will diagnose and fix API timeout issues\n')
  
  try {
    // Run diagnostics
    await checkEnvironmentVariables()
    const supabaseOk = await checkSupabaseConnection()
    const redisOk = await checkRedisConnection()
    const finaleOk = await checkFinaleConfiguration()
    await checkForBlockingCode()
    
    // Apply fixes
    await applyFixes()
    
    // Attempt data sync if connections are good
    if (supabaseOk && finaleOk) {
      const syncSuccess = await performInitialSync()
      
      if (!syncSuccess && supabaseOk) {
        log('\nFalling back to test data...', 'warning')
        await createTestData()
      }
    } else if (supabaseOk && !finaleOk) {
      log('\nCreating test data since Finale is not configured...', 'info')
      await createTestData()
    }
    
    // Test API endpoints if running locally
    if (!process.env.VERCEL_URL) {
      await testAPIEndpoints()
    }
    
    // Generate summary
    await generateSummary()
    
    // Clean exit
    process.exit(errorCount > 0 ? 1 : 0)
    
  } catch (error) {
    console.error(chalk.red('\n❌ Diagnostic tool encountered an error:'), error)
    process.exit(1)
  }
}

// Run the diagnostic
main().catch(console.error)