import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/lib/finale-api'

export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({
        error: 'No config found',
        configured: false
      })
    }
    
    const finaleApi = new FinaleApiService(config)
    
    // Get the URL and auth header being used
    const baseUrl = finaleApi['baseUrl']
    const authHeader = finaleApi['authHeader']
    
    // Test the exact URL
    const testUrl = `${baseUrl}/product?limit=1`
    
    console.log('[Test Connection] Testing URL:', testUrl)
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    const responseText = await response.text()
    
    return NextResponse.json({
      configured: true,
      config: {
        accountPath: config.accountPath,
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret
      },
      test: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responsePreview: responseText.substring(0, 500)
      },
      expectedUrl: `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}