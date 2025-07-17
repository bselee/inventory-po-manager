import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    version: '2025-01-17-finale-sync-fix',
    features: {
      finaleInventorySync: 'Fixed with current year filtering',
      finaleVendorSync: 'Fixed with flexible response handling',
      testEndpoint: '/api/test-sync-all available',
      logging: 'Enhanced with [Finale Sync] and [Vendor Sync] prefixes'
    },
    lastCommit: 'f30040f',
    message: 'Finale API sync issues fixed for both inventory and vendors'
  })
}