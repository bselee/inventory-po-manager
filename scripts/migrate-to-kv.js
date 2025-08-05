#!/usr/bin/env node

/**
 * Migrate Data from Supabase to Vercel KV
 * This script handles the complete data migration process
 */

const { createClient } = require('@supabase/supabase-js');
const { kv } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  batchSize: 100,
  backupDir: './migration-backups',
  logFile: './migration.log'
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Logging utility
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  
  try {
    await fs.appendFile(config.logFile, logMessage);
  } catch (error) {
    console.warn('Failed to write to log file:', error.message);
  }
}

// Create backup directory
async function ensureBackupDir() {
  try {
    await fs.mkdir(config.backupDir, { recursive: true });
    await log(`✅ Backup directory ready: ${config.backupDir}`);
  } catch (error) {
    await log(`❌ Failed to create backup directory: ${error.message}`);
    throw error;
  }
}

// Backup table data to JSON
async function backupTable(tableName) {
  try {
    await log(`📦 Backing up table: ${tableName}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    
    const backupPath = path.join(config.backupDir, `${tableName}.json`);
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
    
    await log(`✅ Backed up ${data.length} records from ${tableName}`);
    return data;
  } catch (error) {
    await log(`❌ Failed to backup ${tableName}: ${error.message}`);
    throw error;
  }
}

// Migrate settings table
async function migrateSettings(settingsData) {
  await log('🔄 Migrating settings...');
  
  try {
    for (const setting of settingsData) {
      const key = `settings:${setting.key}`;
      const value = {
        value: setting.value,
        description: setting.description,
        type: setting.type,
        category: setting.category,
        updated_at: setting.updated_at,
        created_at: setting.created_at
      };
      
      await kv.set(key, JSON.stringify(value));
    }
    
    await log(`✅ Migrated ${settingsData.length} settings`);
  } catch (error) {
    await log(`❌ Settings migration failed: ${error.message}`);
    throw error;
  }
}

// Migrate purchase orders
async function migratePurchaseOrders(poData) {
  await log('🔄 Migrating purchase orders...');
  
  try {
    for (const po of poData) {
      const key = `purchase-order:${po.id}`;
      const value = {
        ...po,
        migrated_at: new Date().toISOString()
      };
      
      await kv.set(key, JSON.stringify(value));
      
      // Also add to vendor index
      if (po.vendor_id) {
        const vendorKey = `vendor:${po.vendor_id}:purchase-orders`;
        await kv.sadd(vendorKey, po.id);
      }
      
      // Add to status index
      const statusKey = `purchase-orders:status:${po.status || 'draft'}`;
      await kv.sadd(statusKey, po.id);
    }
    
    await log(`✅ Migrated ${poData.length} purchase orders`);
  } catch (error) {
    await log(`❌ Purchase orders migration failed: ${error.message}`);
    throw error;
  }
}

// Migrate sync logs
async function migrateSyncLogs(syncData) {
  await log('🔄 Migrating sync logs...');
  
  try {
    for (const sync of syncData) {
      const key = `sync-log:${sync.id}`;
      const value = {
        ...sync,
        migrated_at: new Date().toISOString()
      };
      
      // Set with TTL of 90 days for logs
      await kv.set(key, JSON.stringify(value), { ex: 90 * 24 * 60 * 60 });
      
      // Add to date index for easy querying
      const dateKey = sync.created_at.split('T')[0]; // YYYY-MM-DD
      const indexKey = `sync-logs:date:${dateKey}`;
      await kv.sadd(indexKey, sync.id);
    }
    
    await log(`✅ Migrated ${syncData.length} sync logs`);
  } catch (error) {
    await log(`❌ Sync logs migration failed: ${error.message}`);
    throw error;
  }
}

// Migrate vendors
async function migrateVendors(vendorData) {
  await log('🔄 Migrating vendors...');
  
  try {
    for (const vendor of vendorData) {
      const key = `vendor:${vendor.id}`;
      const value = {
        ...vendor,
        migrated_at: new Date().toISOString()
      };
      
      await kv.set(key, JSON.stringify(value));
      
      // Add to name index for searching
      const nameKey = `vendors:name:${vendor.name.toLowerCase().replace(/\s+/g, '-')}`;
      await kv.set(nameKey, vendor.id);
    }
    
    await log(`✅ Migrated ${vendorData.length} vendors`);
  } catch (error) {
    await log(`❌ Vendors migration failed: ${error.message}`);
    throw error;
  }
}

// Verify migration
async function verifyMigration() {
  await log('🔍 Verifying migration...');
  
  try {
    // Check settings
    const settingsPattern = 'settings:*';
    const settingsKeys = await kv.keys(settingsPattern);
    await log(`📊 Found ${settingsKeys.length} settings in KV`);
    
    // Check purchase orders
    const poPattern = 'purchase-order:*';
    const poKeys = await kv.keys(poPattern);
    await log(`📊 Found ${poKeys.length} purchase orders in KV`);
    
    // Check vendors
    const vendorPattern = 'vendor:*';
    const vendorKeys = await kv.keys(vendorPattern);
    await log(`📊 Found ${vendorKeys.length} vendors in KV`);
    
    // Check sync logs
    const syncPattern = 'sync-log:*';
    const syncKeys = await kv.keys(syncPattern);
    await log(`📊 Found ${syncKeys.length} sync logs in KV`);
    
    await log('✅ Migration verification complete');
    
    return {
      settings: settingsKeys.length,
      purchaseOrders: poKeys.length,
      vendors: vendorKeys.length,
      syncLogs: syncKeys.length
    };
  } catch (error) {
    await log(`❌ Migration verification failed: ${error.message}`);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  const startTime = Date.now();
  await log('🚀 Starting Supabase to Vercel KV migration...');
  
  try {
    // Ensure backup directory exists
    await ensureBackupDir();
    
    // Define tables to migrate
    const tables = ['settings', 'purchase_orders', 'sync_logs', 'vendors'];
    const backupData = {};
    
    // Backup all data first
    for (const table of tables) {
      backupData[table] = await backupTable(table);
    }
    
    await log('📦 All data backed up successfully');
    
    // Migrate each table
    if (backupData.settings) {
      await migrateSettings(backupData.settings);
    }
    
    if (backupData.purchase_orders) {
      await migratePurchaseOrders(backupData.purchase_orders);
    }
    
    if (backupData.sync_logs) {
      await migrateSyncLogs(backupData.sync_logs);
    }
    
    if (backupData.vendors) {
      await migrateVendors(backupData.vendors);
    }
    
    // Verify migration
    const stats = await verifyMigration();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    await log(`🎉 Migration completed successfully in ${duration} seconds`);
    await log(`📊 Migration Summary:`);
    await log(`   Settings: ${stats.settings}`);
    await log(`   Purchase Orders: ${stats.purchaseOrders}`);
    await log(`   Vendors: ${stats.vendors}`);
    await log(`   Sync Logs: ${stats.syncLogs}`);
    
    console.log('\n✅ Migration Complete!');
    console.log(`📄 Full migration log: ${config.logFile}`);
    console.log(`📦 Data backups: ${config.backupDir}`);
    
  } catch (error) {
    await log(`💥 Migration failed: ${error.message}`);
    console.error('\n❌ Migration Failed!');
    console.error(`Error: ${error.message}`);
    console.error(`📄 Check migration log: ${config.logFile}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 Dry run mode - no data will be migrated');
  // In dry run mode, only backup data and show what would be migrated
} else {
  // Run the migration
  runMigration().catch(console.error);
}
