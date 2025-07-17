import { NextResponse } from 'next/server'

export async function GET() {
  // Simple endpoint to force components to refresh
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    message: 'Use this to trigger refreshes'
  })
}