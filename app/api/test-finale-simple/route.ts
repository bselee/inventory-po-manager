import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { rateLimitedFetch } from '@/app/lib/finale-rate-limiter'
import { formatFinaleError } from '@/app/lib/finale-error-messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      const errorInfo = formatFinaleError(
        new Error('No Finale configuration found'),
        'test-connection'
      )
      return NextResponse.json({ 
        success: false,
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions,
        debug: {
          hasEnvVars: !!(process.env.FINALE_API_KEY),
          context: 'Configuration check'
        }
      })
    }

    // Test direct API call to Finale with rate limiting
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    
    console.log('[Test Finale Simple] Testing connection to:', config.accountPath)
    
    try {
      const response = await rateLimitedFetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'BuildASoil-Inventory/1.0'
        }
      })

      console.log('[Test Finale Simple] Response status:', response.status)
      
      if (!response.ok) {
        const errorInfo = formatFinaleError(response, 'test-connection')
        
        // Add specific debug info
        const debugInfo: any = {
          status: response.status,
          accountPath: config.accountPath,
          hasApiKey: !!config.apiKey,
          hasApiSecret: !!config.apiSecret,
          url: testUrl.replace(config.apiKey, '***').replace(config.apiSecret, '***')
        }
        
        // Try to get response body for additional context
        try {
          const responseText = await response.text()
          if (responseText) {
            debugInfo.responsePreview = responseText.substring(0, 200)
          }
        } catch (e) {
          // Ignore if can't read response
        }
        
        return NextResponse.json({ 
          success: false,
          error: errorInfo.title,
          details: errorInfo.message,
          solutions: errorInfo.solutions,
          debug: debugInfo
        })
      }

      const responseText = await response.text()
      
      // Try to parse response
      try {
        const data = JSON.parse(responseText)
        
        // Check if it's the expected format
        let productCount = 0
        let format = 'Unknown'
        
        if (data.productId && Array.isArray(data.productId)) {
          // Parallel array format
          productCount = data.productId.length
          format = 'Finale parallel array format'
        } else if (Array.isArray(data)) {
          // Direct array format
          productCount = data.length
          format = 'Array format'
        } else if (data.data && Array.isArray(data.data)) {
          // Nested data format
          productCount = data.data.length
          format = 'Nested data format'
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Connection successful! ✓',
          details: `Found ${productCount} product${productCount !== 1 ? 's' : ''} in test request`,
          debug: {
            format,
            productCount,
            accountPath: config.accountPath,
            apiVersion: 'v1'
          },
          recommendations: productCount === 0 ? [
            'Connection works but no products found in test',
            'This is normal if you have many products - the API limits responses',
            'Proceed with sync to import your full inventory'
          ] : []
        })
      } catch (e) {
        // Response received but couldn't parse
        return NextResponse.json({ 
          success: true,
          message: 'Connection successful! ✓',
          details: 'Connected to Finale but response format is unexpected',
          debug: {
            parseError: e instanceof Error ? e.message : 'Unknown parse error',
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 100)
          },
          recommendations: [
            'Connection works but response format is unusual',
            'You can still try to proceed with sync',
            'Contact support if sync fails'
          ]
        })
      }

    } catch (error) {
      console.error('[Test Finale Simple] Error:', error)
      
      const errorInfo = formatFinaleError(error, 'test-connection')
      
      return NextResponse.json({ 
        success: false,
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions,
        debug: {
          errorType: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('[Test Finale Simple] Outer Error:', error)
    
    const errorInfo = formatFinaleError(error, 'test-connection')
    
    return NextResponse.json({ 
      success: false,
      error: errorInfo.title,
      details: errorInfo.message,
      solutions: errorInfo.solutions,
      debug: {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    })
  }
}