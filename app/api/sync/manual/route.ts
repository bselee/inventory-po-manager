import { NextResponse } from 'next/server'
import { getFinaleSettings } from '../../settings/simple/route'
import { updateSyncStatus } from '../status/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/sync/manual - Trigger manual inventory sync
export async function POST(request: Request) {
  try {
    // Update status to running
    await updateSyncStatus({
      isRunning: true,
      error: null
    })
    
    // Get settings
    const settings = await getFinaleSettings()
    
    if (!settings || !settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      await updateSyncStatus({
        isRunning: false,
        error: 'Finale API not configured'
      })
      
      return NextResponse.json(
        { success: false, error: 'Finale API credentials not configured. Please configure settings first.' },
        { status: 400 }
      )
    }
    
    // Clean the account path
    const cleanAccountPath = settings.finale_account_path
      .replace('https://', '')
      .replace('http://', '')
      .replace('app.finaleinventory.com/', '')
      .replace(/\/.*$/, '')
      .trim()
    
    // Fetch inventory from Finale API
    const inventoryUrl = `https://app.finaleinventory.com/${cleanAccountPath}/api/products`
    const authHeader = 'Basic ' + Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
    
    
    const response = await fetch(inventoryUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorMessage = `Failed to fetch inventory: ${response.status} ${response.statusText}`
      
      await updateSyncStatus({
        isRunning: false,
        error: errorMessage,
        lastSync: new Date().toISOString()
      })
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    const items = Array.isArray(data) ? data : data.products || []
    
    
    // For now, just update the sync status
    // In a real implementation, you would save this data to your database
    await updateSyncStatus({
      isRunning: false,
      lastSync: new Date().toISOString(),
      itemsUpdated: items.length,
      error: null
    })
    
    // Store inventory data in a temporary file for the inventory page to use
    // This is a simple solution without a database
    const fs = await import('fs/promises')
    const path = await import('path')
    const inventoryFile = path.join(process.cwd(), '.inventory-cache.json')
    
    // Transform Finale data to match our expected format
    const transformedItems = items.map((item: any) => ({
      id: item.productId || item.id,
      sku: item.productId || item.sku || '',
      product_name: item.product || item.name || '',
      current_stock: item.quantityAvailable || item.stockLevel || 0,
      reorder_point: item.reorderPoint || settings.low_stock_threshold,
      vendor: item.primarySupplierName || item.vendor || 'Unknown',
      location: item.defaultLocationName || item.location || 'Main',
      unit_cost: item.averageCost || item.cost || 0,
      unit_price: item.price || 0,
      last_updated: new Date().toISOString()
    }))
    
    await fs.writeFile(inventoryFile, JSON.stringify({
      items: transformedItems,
      lastSync: new Date().toISOString(),
      totalItems: transformedItems.length
    }, null, 2))
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${items.length} items from Finale`,
      itemsUpdated: items.length
    })
    
  } catch (error) {
    console.error('Manual sync error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    await updateSyncStatus({
      isRunning: false,
      error: errorMessage,
      lastSync: new Date().toISOString()
    })
    
    return NextResponse.json(
      { success: false, error: `Sync failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}