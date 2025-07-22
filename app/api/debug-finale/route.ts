import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    // Validate required fields
    const missingFields = []
    if (!settings.finale_api_key) missingFields.push('finale_api_key')
    if (!settings.finale_api_secret) missingFields.push('finale_api_secret')
    if (!settings.finale_account_path) missingFields.push('finale_account_path')
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        debug: { missingFields }
      }, { status: 400 })
    }

    // Clean account path (remove any URL parts if accidentally included)
    const cleanAccountPath = settings.finale_account_path
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()

    // Build auth header
    const authString = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
    
    // Test URL with minimal data
    const testUrl = `https://app.finaleinventory.com/api/${cleanAccountPath}/product?limit=1`
    
    const debugInfo = {
      originalAccountPath: settings.finale_account_path,
      cleanedAccountPath: cleanAccountPath,
      testUrl: testUrl,
      authHeaderLength: authString.length,
      apiKeyLength: settings.finale_api_key.length,
      apiSecretLength: settings.finale_api_secret.length
    }

    console.log('Finale API Debug:', debugInfo)

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BuildASoil-Inventory-Manager/1.0'
        }
      })

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      if (response.ok) {
        const data = await response.json()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Finale connection successful',
          debug: {
            ...debugInfo,
            status: response.status,
            statusText: response.statusText,
            dataReceived: Array.isArray(data) ? `${data.length} products` : 'Unexpected format',
            sampleData: Array.isArray(data) && data.length > 0 ? {
              productId: data[0].productId,
              productSku: data[0].productSku,
              productName: data[0].productName
            } : null
          }
        })
      } else {
        const errorText = await response.text()
        
        return NextResponse.json({ 
          success: false, 
          error: `Finale API error: ${response.status} ${response.statusText}`,
          debug: {
            ...debugInfo,
            status: response.status,
            statusText: response.statusText,
            errorResponse: errorText,
            responseHeaders: responseHeaders
          }
        })
      }
    } catch (fetchError: any) {
      return NextResponse.json({ 
        success: false, 
        error: `Network error: ${fetchError.message}`,
        debug: {
          ...debugInfo,
          errorType: fetchError.name,
          errorMessage: fetchError.message,
          errorStack: fetchError.stack?.split('\n').slice(0, 3)
        }
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test Finale connection',
      debug: {
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 })
  }
}