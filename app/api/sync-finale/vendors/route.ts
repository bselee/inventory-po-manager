// Vendor sync endpoint
import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { FinaleVendorService } from '@/app/lib/finale-vendors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    const vendorService = new FinaleVendorService(config)
    
    // Sync vendors
    const result = await vendorService.syncVendorsToSupabase()
    
    return NextResponse.json(result)
  } catch (error) {
    logError('[Vendor Sync] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

// GET endpoint to list vendors
export async function GET() {
  try {
    const { supabase } = await import('@/app/lib/supabase')
    
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    
    return NextResponse.json({
      vendors: vendors || [],
      count: vendors?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}