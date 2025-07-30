/**
 * Central export point for all data access layer modules
 * This provides a clean interface for database operations
 */

// Inventory operations
export * from './inventory'

// Settings operations
export * from './settings'

// Sync log operations
export * from './sync-logs'

// Export types
export type { SyncLog } from './sync-logs'

// Vendor operations
export * from './vendors'

// Re-export commonly used functions for convenience
export {
  // Inventory
  getInventoryItems,
  getInventoryItemById,
  getInventorySummary,
  updateInventoryStock,
  updateInventoryCost,
  createInventoryItem,
  updateInventoryItem,
  getItemsNeedingReorder,
  getCriticalStockItems,
  getOverstockedItems
} from './inventory'

export {
  // Settings
  getSettings,
  upsertSettings,
  updateSettings,
  getFinaleConfig,
  getEmailConfig,
  updateLastSyncDate,
  isSyncEnabled,
  setSyncEnabled
} from './settings'

export {
  // Sync logs
  createSyncLog,
  updateSyncLog,
  completeSyncLog,
  failSyncLog,
  getSyncLogById,
  isAnySyncRunning,
  getRunningSyncLog,
  getRecentSyncLogs,
  getLastSuccessfulSync,
  markStuckSyncsAsFailed,
  getSyncStats
} from './sync-logs'

export {
  // Vendors
  getVendors,
  getVendorById,
  getVendorByName,
  createVendor,
  updateVendor,
  deactivateVendor,
  syncVendorFromFinale,
  getVendorsWithLowStockItems,
  getVendorStats
} from './vendors'