import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Sync status file path
const SYNC_STATUS_FILE = path.join(process.cwd(), '.sync-status.json')

interface SyncStatus {
  lastSync: string | null
  nextSync: string | null
  isRunning: boolean
  itemsUpdated: number | null
  error: string | null
}

async function loadSyncStatus(): Promise<SyncStatus> {
  try {
    const fileContent = await fs.readFile(SYNC_STATUS_FILE, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    // File doesn't exist, return default status
    return {
      lastSync: null,
      nextSync: null,
      isRunning: false,
      itemsUpdated: null,
      error: null
    }
  }
}

async function saveSyncStatus(status: SyncStatus): Promise<void> {
  try {
    await fs.writeFile(SYNC_STATUS_FILE, JSON.stringify(status, null, 2))
  } catch (error) {
    console.error('Failed to save sync status:', error)
  }
}

// GET /api/sync/status - Get current sync status
export async function GET() {
  try {
    const status = await loadSyncStatus()
    
    // Calculate next sync time if we have a last sync and settings
    if (status.lastSync && !status.isRunning) {
      try {
        const settingsFile = path.join(process.cwd(), '.settings.json')
        const settingsContent = await fs.readFile(settingsFile, 'utf-8')
        const settings = JSON.parse(settingsContent)
        
        if (settings.sync_enabled) {
          const lastSyncTime = new Date(status.lastSync).getTime()
          const frequencyMs = (settings.sync_frequency_minutes || 60) * 60 * 1000
          const nextSyncTime = new Date(lastSyncTime + frequencyMs)
          status.nextSync = nextSyncTime.toISOString()
        }
      } catch (error) {
        // Settings not available, skip next sync calculation
      }
    }
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error loading sync status:', error)
    return NextResponse.json(
      { error: 'Failed to load sync status' },
      { status: 500 }
    )
  }
}

// POST /api/sync/status - Update sync status (internal use)
export async function POST(request: Request) {
  try {
    const updates = await request.json()
    const currentStatus = await loadSyncStatus()
    
    const newStatus = {
      ...currentStatus,
      ...updates
    }
    
    await saveSyncStatus(newStatus)
    
    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Error updating sync status:', error)
    return NextResponse.json(
      { error: 'Failed to update sync status' },
      { status: 500 }
    )
  }
}

// Export function for other API routes to update status
export async function updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
  try {
    const currentStatus = await loadSyncStatus()
    const newStatus = {
      ...currentStatus,
      ...updates
    }
    await saveSyncStatus(newStatus)
  } catch (error) {
    console.error('Failed to update sync status:', error)
  }
}