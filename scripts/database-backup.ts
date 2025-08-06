#!/usr/bin/env node

/**
 * Automated Database Backup Script
 * Backs up Supabase PostgreSQL database to local storage or cloud
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)
const gzip = promisify(zlib.gzip)

interface BackupConfig {
  supabaseUrl: string
  supabaseKey: string
  databaseUrl?: string
  backupPath: string
  retention: number // Days to keep backups
  compression: boolean
  uploadToCloud: boolean
  cloudProvider?: 'aws' | 'gcp' | 'azure'
  cloudConfig?: Record<string, string>
}

class DatabaseBackup {
  private config: BackupConfig
  private supabase: any

  constructor() {
    this.config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      databaseUrl: process.env.DATABASE_URL,
      backupPath: process.env.BACKUP_PATH || './backups',
      retention: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compression: process.env.BACKUP_COMPRESSION !== 'false',
      uploadToCloud: process.env.BACKUP_UPLOAD_TO_CLOUD === 'true',
      cloudProvider: process.env.BACKUP_CLOUD_PROVIDER as any,
      cloudConfig: {
        awsBucket: process.env.AWS_BACKUP_BUCKET || '',
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        gcpBucket: process.env.GCP_BACKUP_BUCKET || '',
        azureContainer: process.env.AZURE_BACKUP_CONTAINER || ''
      }
    }

    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey)
  }

  /**
   * Execute the backup process
   */
  async backup(): Promise<void> {
    const startTime = Date.now()

    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory()

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `backup-${timestamp}`

      // Perform the backup
      const backupData = await this.exportDatabase()
      
      // Save backup locally
      const savedPath = await this.saveBackup(filename, backupData)
      // Upload to cloud if configured
      if (this.config.uploadToCloud) {
        await this.uploadToCloud(savedPath, filename)
      }

      // Clean up old backups
      await this.cleanupOldBackups()

      const duration = Math.round((Date.now() - startTime) / 1000)
      // Log success to monitoring
      await this.logBackupStatus('success', duration, savedPath)
    } catch (error) {
      console.error('[Backup] Failed:', error)
      await this.logBackupStatus('failed', 0, '', error)
      throw error
    }
  }

  /**
   * Export database data
   */
  private async exportDatabase(): Promise<any> {
    const tables = [
      'inventory_items',
      'purchase_orders',
      'vendors',
      'settings',
      'sync_logs',
      'users',
      'auth_sessions'
    ]

    const backup: Record<string, any> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tables: {}
    }

    for (const table of tables) {
      try {
        // Fetch all data from table
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
        
        if (error) {
          console.error(`[Backup] Error exporting ${table}:`, error)
          continue
        }

        backup.tables[table] = {
          count: data?.length || 0,
          data: data || []
        }
      } catch (error) {
        console.error(`[Backup] Failed to export ${table}:`, error)
      }
    }

    return backup
  }

  /**
   * Save backup to local storage
   */
  private async saveBackup(filename: string, data: any): Promise<string> {
    const jsonData = JSON.stringify(data, null, 2)
    
    let finalData: Buffer | string = jsonData
    let finalFilename = `${filename}.json`

    if (this.config.compression) {
      finalData = await gzip(jsonData)
      finalFilename = `${filename}.json.gz`
    }

    const filepath = path.join(this.config.backupPath, finalFilename)
    await fs.promises.writeFile(filepath, finalData)
    
    // Get file size
    const stats = await fs.promises.stat(filepath)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
    return filepath
  }

  /**
   * Upload backup to cloud storage
   */
  private async uploadToCloud(localPath: string, filename: string): Promise<void> {
    switch (this.config.cloudProvider) {
      case 'aws':
        await this.uploadToAWS(localPath, filename)
        break
      case 'gcp':
        await this.uploadToGCP(localPath, filename)
        break
      case 'azure':
        await this.uploadToAzure(localPath, filename)
        break
      default:
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToAWS(localPath: string, filename: string): Promise<void> {
    const bucket = this.config.cloudConfig?.awsBucket
    if (!bucket) {
      console.error('[Backup] AWS S3 bucket not configured')
      return
    }

    try {
      // Use AWS CLI if available
      const command = `aws s3 cp "${localPath}" "s3://${bucket}/database-backups/${filename}" --storage-class STANDARD_IA`
      await execAsync(command)
    } catch (error) {
      console.error('[Backup] AWS upload failed:', error)
      // Could implement AWS SDK upload here
    }
  }

  /**
   * Upload to Google Cloud Storage
   */
  private async uploadToGCP(localPath: string, filename: string): Promise<void> {
    const bucket = this.config.cloudConfig?.gcpBucket
    if (!bucket) {
      console.error('[Backup] GCP bucket not configured')
      return
    }

    try {
      // Use gsutil if available
      const command = `gsutil cp "${localPath}" "gs://${bucket}/database-backups/${filename}"`
      await execAsync(command)
    } catch (error) {
      console.error('[Backup] GCP upload failed:', error)
      // Could implement GCP SDK upload here
    }
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(localPath: string, filename: string): Promise<void> {
    const container = this.config.cloudConfig?.azureContainer
    if (!container) {
      console.error('[Backup] Azure container not configured')
      return
    }

    try {
      // Use Azure CLI if available
      const command = `az storage blob upload --file "${localPath}" --container-name "${container}" --name "database-backups/${filename}"`
      await execAsync(command)
    } catch (error) {
      console.error('[Backup] Azure upload failed:', error)
      // Could implement Azure SDK upload here
    }
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(): Promise<void> {
    const files = await fs.promises.readdir(this.config.backupPath)
    const now = Date.now()
    const maxAge = this.config.retention * 24 * 60 * 60 * 1000 // Convert days to ms
    
    let deletedCount = 0
    
    for (const file of files) {
      if (!file.startsWith('backup-')) continue
      
      const filepath = path.join(this.config.backupPath, file)
      const stats = await fs.promises.stat(filepath)
      const age = now - stats.mtimeMs
      
      if (age > maxAge) {
        await fs.promises.unlink(filepath)
        deletedCount++
      }
    }
    
    if (deletedCount > 0) {
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.config.backupPath)
    } catch {
      await fs.promises.mkdir(this.config.backupPath, { recursive: true })
    }
  }

  /**
   * Log backup status to database
   */
  private async logBackupStatus(
    status: 'success' | 'failed',
    duration: number,
    filepath: string,
    error?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          sync_type: 'database_backup',
          status,
          items_synced: status === 'success' ? 1 : 0,
          items_failed: status === 'failed' ? 1 : 0,
          duration,
          error_message: error ? String(error) : null,
          metadata: {
            filepath,
            timestamp: new Date().toISOString(),
            retention: this.config.retention,
            compressed: this.config.compression,
            cloudUpload: this.config.uploadToCloud
          }
        })
    } catch (logError) {
      console.error('[Backup] Failed to log backup status:', logError)
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupFile: string): Promise<void> {
    try {
      // Read backup file
      let data = await fs.promises.readFile(backupFile)
      
      // Decompress if needed
      if (backupFile.endsWith('.gz')) {
        const gunzip = promisify(zlib.gunzip)
        data = await gunzip(data)
      }
      
      const backup = JSON.parse(data.toString())
      // Restore each table
      for (const [table, tableData] of Object.entries(backup.tables)) {
        const { data: rows } = tableData as any
        
        if (!rows || rows.length === 0) {
          continue
        }
        // Use upsert to handle existing records
        const { error } = await this.supabase
          .from(table)
          .upsert(rows, { onConflict: 'id' })
        
        if (error) {
          console.error(`[Backup] Error restoring ${table}:`, error)
        } else {
        }
      }
    } catch (error) {
      console.error('[Backup] Restore failed:', error)
      throw error
    }
  }
}

// Execute backup if run directly
if (require.main === module) {
  const backup = new DatabaseBackup()
  
  const command = process.argv[2]
  
  if (command === 'restore' && process.argv[3]) {
    backup.restore(process.argv[3])
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error)
        process.exit(1)
      })
  } else {
    backup.backup()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error)
        process.exit(1)
      })
  }
}

export default DatabaseBackup