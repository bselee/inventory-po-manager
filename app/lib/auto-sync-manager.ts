// Auto Sync Manager - Handles automatic syncing in both development and production
import { FinaleApiService, getFinaleConfig } from './finale-api'
import { supabase } from './supabase'

// Global to track if auto-sync is running
let autoSyncInterval: NodeJS.Timeout | null = null
let isAutoSyncRunning = false

export async function startAutoSync() {
  // Check if we should enable auto-sync
  const { data: settings } = await supabase
    .from('settings')
    .select('sync_enabled, sync_frequency_minutes')
    .single()
  
  if (!settings?.sync_enabled) {
    console.log('🔄 Auto-sync is disabled in settings')
    return
  }
  
  const frequencyMinutes = settings.sync_frequency_minutes || 60
  
  // Clear any existing interval
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
  }
  
  console.log(`🔄 Starting auto-sync every ${frequencyMinutes} minutes`)
  
  // Run initial sync check
  await runAutoSync()
  
  // Set up interval for future syncs
  autoSyncInterval = setInterval(async () => {
    await runAutoSync()
  }, frequencyMinutes * 60 * 1000)
}

export async function runAutoSync() {
  if (isAutoSyncRunning) {
    console.log('🔄 Auto-sync already running, skipping...')
    return
  }
  
  isAutoSyncRunning = true
  
  try {
    // Check if a sync is already running
    const { data: runningSync } = await supabase
      .from('sync_logs')
      .select('id, synced_at')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (runningSync) {
      console.log('🔄 Sync already in progress, skipping auto-sync')
      return
    }
    
    // Check last sync time
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('synced_at')
      .eq('sync_type', 'finale_inventory')
      .in('status', ['success', 'partial'])
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // Check if we need to sync
    let shouldSync = false
    let reason = ''
    
    if (!lastSync) {
      shouldSync = true
      reason = 'No previous sync found'
    } else {
      const minutesSinceSync = (Date.now() - new Date(lastSync.synced_at).getTime()) / (1000 * 60)
      const { data: settings } = await supabase
        .from('settings')
        .select('sync_frequency_minutes')
        .single()
      
      const frequencyMinutes = settings?.sync_frequency_minutes || 60
      
      if (minutesSinceSync >= frequencyMinutes) {
        shouldSync = true
        reason = `Last sync was ${Math.round(minutesSinceSync)} minutes ago`
      }
    }
    
    if (shouldSync) {
      console.log(`🔄 Auto-sync triggered: ${reason}`)
      
      const config = await getFinaleConfig()
      if (!config) {
        console.log('❌ Auto-sync failed: Finale not configured')
        return
      }
      
      const finaleApi = new FinaleApiService(config)
      
      // Test connection first
      const isConnected = await finaleApi.testConnection()
      if (!isConnected) {
        console.log('❌ Auto-sync failed: Cannot connect to Finale')
        return
      }
      
      // Log auto-sync start
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_inventory',
          status: 'running',
          synced_at: new Date().toISOString(),
          metadata: {
            source: 'auto',
            reason,
            environment: process.env.NODE_ENV
          }
        })
      
      // Run the sync using smart strategy
      console.log('🔄 Starting automatic sync...')
      const result = await finaleApi.syncSmart()
      
      if (result.success) {
        console.log(`✅ Auto-sync complete: ${result.processed} items processed`)
        
        // Update last sync time in settings
        await supabase
          .from('settings')
          .update({ last_sync_time: new Date().toISOString() })
          .eq('id', 1)
      } else {
        console.log(`❌ Auto-sync failed: ${result.error}`)
      }
    } else {
      console.log('🔄 Auto-sync check: No sync needed at this time')
    }
  } catch (error) {
    console.error('❌ Auto-sync error:', error)
  } finally {
    isAutoSyncRunning = false
  }
}

export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
    console.log('🔄 Auto-sync stopped')
  }
}

// Function to check and run initial sync on startup
export async function checkInitialSync() {
  try {
    // Check if we have any inventory data
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    if (count === 0) {
      console.log('📦 No inventory data found. Running initial sync...')
      await runAutoSync()
    } else {
      console.log(`📦 Found ${count} inventory items.`)
      
      // Check if sync is overdue
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('synced_at')
        .eq('sync_type', 'finale_inventory')
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (lastSync) {
        const hoursSinceSync = (Date.now() - new Date(lastSync.synced_at).getTime()) / (1000 * 60 * 60)
        if (hoursSinceSync > 24) {
          console.log(`⚠️  Last sync was ${Math.round(hoursSinceSync)} hours ago. Running sync...`)
          await runAutoSync()
        }
      }
    }
  } catch (error) {
    console.error('Initial sync check error:', error)
  }
}