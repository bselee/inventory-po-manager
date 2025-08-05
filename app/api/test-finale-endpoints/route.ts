import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { rateLimitedFetch } from '@/lib/finale-rate-limiter'
import { formatFinaleError } from '@/app/lib/finale-error-messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      const errorInfo = formatFinaleError(
        new Error('No Finale configuration found'),
        'test-endpoints'
      )
      return NextResponse.json({ 
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions
      })
    }

    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    
    // Try different endpoint variations
    const endpoints = [
      `/api/products`,
      `/api/product`,
      `/api/inventory`,
      `/api/items`,
      `/api`
    ]
    
    const results = []
    
    for (const endpoint of endpoints) {
      const url = `https://app.finaleinventory.com/${config.accountPath}${endpoint}`
      
      try {
        const response = await rateLimitedFetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'User-Agent': 'BuildASoil-Inventory/1.0'
          }
        })
        
        const text = await response.text()
        
        results.push({
          endpoint,
          status: response.status,
          bodyLength: text.length,
          bodyPreview: text.substring(0, 100),
          isUndefined: text === 'undefined',
          contentType: response.headers.get('content-type')
        })
      } catch (error) {
        results.push({
          endpoint,
          error: error instanceof Error ? error.message : 'Failed'
        })
      }
    }
    
    return NextResponse.json({ 
      accountPath: config.accountPath,
      results 
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}