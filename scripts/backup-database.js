#!/usr/bin/env node

/**
 * Database Backup and Recovery Script
 * Creates backups of critical data and provides recovery utilities
 */

const { supabaseAdmin } = require('../lib/supabase');
const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = './backups';
const MAX_BACKUPS = 10; // Keep last 10 backups

async function ensureBackupDirectory() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function backupTable(tableName, filename) {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*');
    
    if (error) {
      throw new Error(`Failed to backup ${tableName}: ${error.message}`);
    }
    
    const backupData = {
      table: tableName,
      timestamp: new Date().toISOString(),
      recordCount: data.length,
      data: data,
    };
    
    await fs.writeFile(filename, JSON.stringify(backupData, null, 2), 'utf8');
    return { success: true, recordCount: data.length };
  } catch (error) {
    console.error(`❌ ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createFullBackup() {
  await ensureBackupDirectory();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  
  await fs.mkdir(backupPath, { recursive: true });
  
  const tables = [
    'inventory_items',
    'purchase_orders',
    'sync_logs',
    'failed_items',
    'settings',
    'audit_log',
  ];
  
  const backupResults = {};
  let totalRecords = 0;
  
  for (const table of tables) {
    const filename = path.join(backupPath, `${table}.json`);
    const result = await backupTable(table, filename);
    backupResults[table] = result;
    
    if (result.success) {
      totalRecords += result.recordCount;
    }
  }
  
  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    tables: backupResults,
    totalRecords,
    backupPath,
    version: '1.0.0',
  };
  
  await fs.writeFile(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  // Clean up old backups
  await cleanupOldBackups();
  
  return manifest;
}

async function cleanupOldBackups() {
  try {
    const backupDirs = await fs.readdir(BACKUP_DIR);
    const backupPaths = backupDirs
      .filter(dir => dir.startsWith('backup-'))
      .map(dir => ({
        name: dir,
        path: path.join(BACKUP_DIR, dir),
        timestamp: dir.replace('backup-', ''),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    if (backupPaths.length > MAX_BACKUPS) {
      const toDelete = backupPaths.slice(MAX_BACKUPS);
      
      for (const backup of toDelete) {
        await fs.rm(backup.path, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not cleanup old backups: ${error.message}`);
  }
}

async function listBackups() {
  try {
    await ensureBackupDirectory();
    
    const backupDirs = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const dir of backupDirs) {
      if (dir.startsWith('backup-')) {
        const manifestPath = path.join(BACKUP_DIR, dir, 'manifest.json');
        
        try {
          const manifestData = await fs.readFile(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestData);
          backups.push({
            name: dir,
            ...manifest,
          });
        } catch {
          // Backup without manifest
          backups.push({
            name: dir,
            timestamp: dir.replace('backup-', ''),
            incomplete: true,
          });
        }
      }
    }
    
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (backups.length === 0) {
    } else {
      backups.forEach((backup, i) => {
        const status = backup.incomplete ? '⚠️  INCOMPLETE' : '✅ COMPLETE';
        if (!backup.incomplete) {
        }
      });
    }
    
    return backups;
  } catch (error) {
    console.error(`❌ Could not list backups: ${error.message}`);
    return [];
  }
}

async function restoreFromBackup(backupName, options = {}) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  const manifestPath = path.join(backupPath, 'manifest.json');
  
  try {
    const manifestData = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);
    if (!options.confirmed) {
      return { success: false, message: 'Confirmation required' };
    }
    
    const restoreResults = {};
    
    for (const [tableName, tableInfo] of Object.entries(manifest.tables)) {
      if (!tableInfo.success) {
        continue;
      }
      try {
        const tableBackupPath = path.join(backupPath, `${tableName}.json`);
        const backupData = JSON.parse(await fs.readFile(tableBackupPath, 'utf8'));
        
        if (options.clearBefore) {
          // Clear existing data
          const { error: deleteError } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
          
          if (deleteError) {
            console.warn(`⚠️  Could not clear ${tableName}: ${deleteError.message}`);
          }
        }
        
        // Insert backup data in chunks
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < backupData.data.length; i += chunkSize) {
          chunks.push(backupData.data.slice(i, i + chunkSize));
        }
        
        let restoredCount = 0;
        for (const chunk of chunks) {
          const { error } = await supabaseAdmin
            .from(tableName)
            .upsert(chunk);
          
          if (error) {
            throw new Error(`Failed to restore chunk: ${error.message}`);
          }
          
          restoredCount += chunk.length;
        }
        
        restoreResults[tableName] = {
          success: true,
          restoredCount,
          originalCount: backupData.recordCount,
        };
      } catch (error) {
        restoreResults[tableName] = {
          success: false,
          error: error.message,
        };
        console.error(`❌ ${tableName}: ${error.message}`);
      }
    }
    const successfulTables = Object.values(restoreResults).filter(r => r.success).length;
    const totalTables = Object.keys(restoreResults).length;
    return { success: true, results: restoreResults };
  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'backup';
  
  if (!supabaseAdmin) {
    console.error('❌ Service role key required for database operations');
    process.exit(1);
  }
  
  switch (command) {
    case 'backup':
      await createFullBackup();
      break;
      
    case 'list':
      await listBackups();
      break;
      
    case 'restore':
      const backupName = args[1];
      if (!backupName) {
        console.error('❌ Please specify backup name to restore');
        process.exit(1);
      }
      
      const options = {
        confirmed: args.includes('--confirmed'),
        clearBefore: args.includes('--clear-before'),
      };
      
      await restoreFromBackup(backupName, options);
      break;
      
    default:
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Backup operation failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  createFullBackup,
  listBackups,
  restoreFromBackup,
  cleanupOldBackups,
};
