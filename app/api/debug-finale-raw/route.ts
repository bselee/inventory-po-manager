import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { rateLimitedFetch } from '@/app/lib/finale-rate-limiter'
import { formatFinaleError } from '@/app/lib/finale-error-messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      const errorInfo = formatFinaleError(
        new Error('No Finale configuration found'),
        'debug-raw'
      )
      return NextResponse.json({ 
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions
      })
    }

    // Test direct API call to Finale with rate limiting
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    
    console.log('[Debug Finale] Calling:', testUrl)
    console.log('[Debug Finale] Auth header present:', !!authHeader)
    
    const response = await rateLimitedFetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'BuildASoil-Inventory/1.0'
      }
    })

    const responseText = await response.text()
    
    console.log('[Debug Finale] Status:', response.status)
    console.log('[Debug Finale] Headers:', Object.fromEntries(response.headers.entries()))
    console.log('[Debug Finale] Response length:', responseText.length)
    console.log('[Debug Finale] First 500 chars:', responseText.substring(0, 500))
    
    return NextResponse.json({ 
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 1000),
      bodyType: typeof responseText,
      isEmpty: responseText.length === 0,
      startsWithHTML: responseText.trimStart().startsWith('<'),
      startsWithJSON: responseText.trimStart().startsWith('{') || responseText.trimStart().startsWith('[')
    })

  } catch (error) {
    console.error('[Debug Finale] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}