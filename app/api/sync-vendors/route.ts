import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('[Vendor Sync] Starting vendor sync process...')
    
    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      console.error('[Vendor Sync] No Finale API credentials configured')
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured. Please update settings.' 
      }, { status: 400 })
    }

    console.log('[Vendor Sync] Initializing Finale API service...')
    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)

    // Test connection first
    console.log('[Vendor Sync] Testing Finale connection...')
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      console.error('[Vendor Sync] Failed to connect to Finale API')
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials.' 
      }, { status: 500 })
    }

    // Get vendors from Finale
    console.log('[Vendor Sync] Fetching vendors from Finale...')
    const finaleVendors = await finaleApi.getVendors()
    console.log(`[Vendor Sync] Fetched ${finaleVendors.length} vendors from Finale`)

    // Log sample vendor data structure for debugging
    if (finaleVendors.length > 0) {
      console.log('[Vendor Sync] Sample vendor structure:', {
        hasVendorName: 'vendorName' in finaleVendors[0],
        hasName: 'name' in finaleVendors[0],
        hasVendorId: 'vendorId' in finaleVendors[0],
        hasId: 'id' in finaleVendors[0],
        sampleKeys: Object.keys(finaleVendors[0]).slice(0, 10)
      })
    }

    // Transform and upsert vendors - handle different property names
    const vendorsToUpsert = finaleVendors.map(vendor => ({
      name: vendor.vendorName || vendor.name || 'Unknown Vendor',
      finale_vendor_id: vendor.vendorId || vendor.id || null,
      contact_name: vendor.contactName || vendor.contact || null,
      email: vendor.email || vendor.emailAddress || null,
      phone: vendor.phone || vendor.phoneNumber || null,
      address: vendor.address || vendor.streetAddress || null,
      notes: vendor.notes || vendor.description || null,
      last_updated: new Date().toISOString()
    }))

    // Batch upsert vendors
    const batchSize = 50
    let processed = 0
    const results = []
    const errors = []

    console.log(`[Vendor Sync] Processing ${vendorsToUpsert.length} vendors in batches of ${batchSize}...`)

    for (let i = 0; i < vendorsToUpsert.length; i += batchSize) {
      const batch = vendorsToUpsert.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      
      console.log(`[Vendor Sync] Processing batch ${batchNumber} with ${batch.length} vendors...`)
      
      const { data, error } = await supabase
        .from('vendors')
        .upsert(batch, { 
          onConflict: 'finale_vendor_id',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error(`[Vendor Sync] Error upserting vendor batch ${batchNumber}:`, error)
        errors.push({ 
          batch: batchNumber, 
          error: error.message,
          details: error.details || error.hint || 'No additional details'
        })
        results.push({ batch: batchNumber, success: false, error: error.message })
      } else {
        processed += batch.length
        results.push({ batch: batchNumber, success: true, count: batch.length })
        console.log(`[Vendor Sync] Batch ${batchNumber} completed successfully`)
      }
    }

    console.log(`[Vendor Sync] Sync completed. Processed ${processed} out of ${finaleVendors.length} vendors`)

    return NextResponse.json({
      success: errors.length === 0,
      totalVendors: finaleVendors.length,
      processed,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0 
        ? `Vendor sync completed with ${errors.length} errors. ${processed} vendors processed successfully.`
        : `Successfully synced ${processed} vendors from Finale.`
    })
  } catch (error) {
    console.error('Vendor sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}