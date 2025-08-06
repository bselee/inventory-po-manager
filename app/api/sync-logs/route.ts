import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    logError('Error fetching sync logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync logs' },
      { status: 500 }
    )
  }
}