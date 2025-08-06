import { NextRequest, NextResponse } from 'next/server'
import { getVendorStats } from '@/lib/data-access/vendors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Get vendor statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorStats = await getVendorStats(params.id)
    return NextResponse.json(vendorStats)
  } catch (error) {
    logError('Error fetching vendor statistics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendor statistics' },
      { status: 500 }
    )
  }
}
