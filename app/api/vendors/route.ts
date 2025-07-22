import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Create a new vendor (sync to Finale)
export async function POST(request: NextRequest) {
  try {
    const vendor = await request.json()
    
    // Get Finale config to create in Finale first
    const config = await getFinaleConfig()
    let finaleVendorId = null
    
    if (config) {
      try {
        const finaleApi = new FinaleApiService(config)
        const finaleResponse = await finaleApi.createVendor(vendor)
        
        // Extract the vendor ID from the response
        finaleVendorId = finaleResponse.vendorId || finaleResponse.id
      } catch (finaleError) {
        console.error('Failed to create vendor in Finale:', finaleError)
        // Continue to create locally even if Finale fails
      }
    }
    
    // Create in our database
    const { data: newVendor, error: dbError } = await supabase
      .from('vendors')
      .insert({
        name: vendor.name,
        finale_vendor_id: finaleVendorId,
        contact_name: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        notes: vendor.notes,
        last_updated: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({
      ...newVendor,
      syncStatus: finaleVendorId ? 'synced' : 'local-only'
    })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create vendor' },
      { status: 500 }
    )
  }
}