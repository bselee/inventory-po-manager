import { NextResponse } from 'next/server';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/sync-status - Get sync status for all services
export async function GET() {
  try {
    // Placeholder: Fetch sync status from database/cache
    const syncStatus = {
      finale: {
        service: 'Finale Inventory',
        status: 'connected',
        lastSync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        nextSync: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        autoSyncEnabled: true,
        syncInterval: 3600,
        lastError: null
      },
      googleSheets: {
        service: 'Google Sheets',
        status: 'disconnected',
        lastSync: null,
        nextSync: null,
        autoSyncEnabled: false,
        syncInterval: 7200,
        lastError: 'API credentials not configured'
      },
      overall: {
        healthy: true,
        activeSyncs: 0,
        pendingSyncs: 0,
        lastActivity: new Date().toISOString()
      }
    };

    return NextResponse.json({ syncStatus });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}