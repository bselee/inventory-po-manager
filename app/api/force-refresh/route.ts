import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  // Simple endpoint to force components to refresh
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    message: 'Use this to trigger refreshes'
  })
}