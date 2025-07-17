import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

// Update a vendor (sync to Finale)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await request.json()
    
    // Update in our database first
    const { data: updatedVendor, error: dbError } = await supabase
      .from('vendors')
      .update({
        name: vendor.name,
        contact_name: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        notes: vendor.notes,
        last_updated: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (dbError) throw dbError

    // If vendor has a Finale ID, sync to Finale
    if (updatedVendor.finale_vendor_id) {
      const config = await getFinaleConfig()
      if (config) {
        try {
          const finaleApi = new FinaleApiService(config)
          await finaleApi.updateVendor(updatedVendor.finale_vendor_id, updatedVendor)
        } catch (finaleError) {
          console.error('Failed to sync vendor to Finale:', finaleError)
          // Don't fail the request if Finale sync fails
          return NextResponse.json({
            ...updatedVendor,
            syncWarning: 'Updated locally but failed to sync to Finale'
          })
        }
      }
    }

    return NextResponse.json(updatedVendor)
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update vendor' },
      { status: 500 }
    )
  }
}