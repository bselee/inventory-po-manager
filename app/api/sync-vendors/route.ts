import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured. Please update settings.' 
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)

    // Test connection first
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials.' 
      }, { status: 500 })
    }

    // Get vendors from Finale
    const finaleVendors = await finaleApi.getVendors()
    console.log(`Fetched ${finaleVendors.length} vendors from Finale`)

    // Transform and upsert vendors
    const vendorsToUpsert = finaleVendors.map(vendor => ({
      name: vendor.vendorName,
      finale_vendor_id: vendor.vendorId,
      contact_name: vendor.contactName || null,
      email: vendor.email || null,
      phone: vendor.phone || null,
      address: vendor.address || null,
      notes: vendor.notes || null,
      last_updated: new Date().toISOString()
    }))

    // Batch upsert vendors
    const batchSize = 50
    let processed = 0
    const results = []

    for (let i = 0; i < vendorsToUpsert.length; i += batchSize) {
      const batch = vendorsToUpsert.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('vendors')
        .upsert(batch, { 
          onConflict: 'finale_vendor_id',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error(`Error upserting vendor batch ${i / batchSize + 1}:`, error)
        results.push({ batch: i / batchSize + 1, error: error.message })
      } else {
        processed += batch.length
        results.push({ batch: i / batchSize + 1, success: true, count: batch.length })
      }
    }

    return NextResponse.json({
      success: true,
      totalVendors: finaleVendors.length,
      processed,
      results
    })
  } catch (error) {
    console.error('Vendor sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}