import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ error: 'No config found' })
    }
    
    const finaleApi = new FinaleApiService(config)
    
    // Get the base URL from the service
    const baseUrl = finaleApi['baseUrl']
    const vendorUrl = `${baseUrl}/vendors?limit=1`
    
    // Try to fetch with the URL
    const response = await fetch(vendorUrl, {
      headers: {
        'Authorization': finaleApi['authHeader'],
        'Accept': 'application/json'
      }
    })
    
    const responseText = await response.text()
    
    return NextResponse.json({
      config: {
        accountPath: config.accountPath,
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret
      },
      urls: {
        baseUrl,
        vendorUrl,
        decodedUrl: decodeURIComponent(vendorUrl)
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        preview: responseText.substring(0, 500)
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}