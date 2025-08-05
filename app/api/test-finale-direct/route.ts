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
        'test-direct'
      )
      return NextResponse.json({ 
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions
      })
    }

    // Test direct API call to Finale with rate limiting
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const url = `https://app.finaleinventory.com/${config.accountPath}/api/products?limit=5`
    
    console.log('[Test Finale] Calling:', url)
    
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'BuildASoil-Inventory/1.0'
      }
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      const errorInfo = formatFinaleError(response, 'test-direct')
      return NextResponse.json({ 
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions,
        debug: {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500),
          url: url.replace(config.apiKey, '***').replace(config.apiSecret, '***')
        }
      })
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText)
      return NextResponse.json({ 
        success: true,
        productCount: data.data?.length || 0,
        sample: data.data?.slice(0, 2),
        hasMore: data.data?.length >= 5
      })
    } catch (e) {
      return NextResponse.json({ 
        error: 'Failed to parse response',
        responsePreview: responseText.substring(0, 200)
      })
    }

  } catch (error) {
    console.error('[Test Finale] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}