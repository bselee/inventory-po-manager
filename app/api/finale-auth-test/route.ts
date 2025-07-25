import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface TestResult {
  method: string
  success: boolean
  details: any
  error?: string
}

export const POST = createApiHandler(async ({ body }) => {
  try {
    const settings = body
    const results: TestResult[] = []
    
    // Extract and clean account path
    let accountPath = settings.finale_account_path || ''
    
    // Handle various input formats
    if (accountPath.includes('finaleinventory.com')) {
      // Extract from full URL: https://app.finaleinventory.com/buildasoilorganics/sc2/
      const match = accountPath.match(/finaleinventory\.com\/([^\/]+)/)
      if (match) {
        accountPath = match[1]
      }
    }
    
    // Clean up the account path
    accountPath = accountPath
      .replace(/^https?:\/\//, '')
      .replace(/^app\./, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/\/$/, '')
      .trim()
    
    console.log('Finale Auth Test - Account Path:', {
      original: settings.finale_account_path,
      cleaned: accountPath
    })

    // Test 1: API Key Authentication with /api/ path
    if (settings.finale_api_key && settings.finale_api_secret) {
      const authString = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
      
      // Try multiple API endpoints - the correct pattern is /{account}/api/
      const apiEndpoints = [
        `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`,
        `https://app.finaleinventory.com/${accountPath}/api/products?limit=1`,
        `https://app.finaleinventory.com/${accountPath}/api/item?limit=1`
      ]
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`Testing API endpoint: ${endpoint}`)
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          })
          
          const responseText = await response.text()
          let responseData
          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = responseText
          }
          
          results.push({
            method: `API Key - ${endpoint}`,
            success: response.ok,
            details: {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              data: response.ok ? responseData : responseText.substring(0, 200)
            }
          })
          
          if (response.ok) break // Stop if we found a working endpoint
        } catch (error: any) {
          results.push({
            method: `API Key - ${endpoint}`,
            success: false,
            details: { error: error.message },
            error: error.message
          })
        }
      }
    }

    // Test 2: Session Authentication (Username/Password)
    if (settings.finale_username && settings.finale_password) {
      // Try different auth endpoints
      const authEndpoints = [
        `https://app.finaleinventory.com/${accountPath}/auth`,
        `https://app.finaleinventory.com/${accountPath}/j_spring_security_check`,
        `https://${accountPath}.finaleinventory.com/auth`,
        `https://app.finaleinventory.com/auth`
      ]
      
      for (const authUrl of authEndpoints) {
        try {
          console.log(`Testing session auth endpoint: ${authUrl}`)
          
          // Try form-encoded authentication (Spring Security style)
          const formData = new URLSearchParams()
          formData.append('j_username', settings.finale_username)
          formData.append('j_password', settings.finale_password)
          
          const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json, text/html, */*'
            },
            body: formData.toString(),
            redirect: 'manual' // Don't follow redirects automatically
          })
          
          const responseText = await response.text()
          const cookies = response.headers.get('set-cookie')
          
          results.push({
            method: `Session Auth - ${authUrl}`,
            success: response.status === 302 || response.status === 200 || !!cookies,
            details: {
              status: response.status,
              statusText: response.statusText,
              hasSessionCookie: !!cookies,
              cookieInfo: cookies ? 'Session cookie received' : 'No session cookie',
              location: response.headers.get('location'),
              responsePreview: responseText.substring(0, 200)
            }
          })
          
          // If we got a session, try to access API
          if (cookies && cookies.includes('JSESSIONID')) {
            const sessionId = cookies.match(/JSESSIONID=([^;]+)/)?.[1]
            
            // Test API access with session
            const apiUrl = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`
            const apiResponse = await fetch(apiUrl, {
              headers: {
                'Cookie': `JSESSIONID=${sessionId}`,
                'Accept': 'application/json'
              }
            })
            
            results.push({
              method: `Session API Access - ${apiUrl}`,
              success: apiResponse.ok,
              details: {
                status: apiResponse.status,
                withSession: true
              }
            })
          }
          
        } catch (error: any) {
          results.push({
            method: `Session Auth - ${authUrl}`,
            success: false,
            details: { error: error.message },
            error: error.message
          })
        }
      }
    }

    // Test 3: Direct browser-style access (no auth)
    try {
      const publicUrl = `https://app.finaleinventory.com/${accountPath}/`
      const response = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      results.push({
        method: `Public Access - ${publicUrl}`,
        success: response.ok,
        details: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        }
      })
    } catch (error: any) {
      results.push({
        method: 'Public Access',
        success: false,
        details: { error: error.message },
        error: error.message
      })
    }

    // Analyze results and provide recommendations
    const successfulMethods = results.filter(r => r.success)
    const recommendations = []
    
    if (successfulMethods.length === 0) {
      recommendations.push('No authentication method succeeded. Please verify:')
      recommendations.push(`1. Account path should be "buildasoilorganics" (not "app" or full URL)`)
      recommendations.push('2. API credentials are correct and have proper permissions')
      recommendations.push('3. Username/password are correct for your Finale account')
    } else {
      successfulMethods.forEach(method => {
        recommendations.push(`✓ ${method.method} is working`)
      })
    }

    return apiResponse({
      success: successfulMethods.length > 0,
      accountPath: {
        original: settings.finale_account_path,
        cleaned: accountPath,
        expected: 'Should be something like "buildasoilorganics"'
      },
      results,
      recommendations,
      debug: {
        testedEndpoints: results.length,
        successfulEndpoints: successfulMethods.length
      }
    })
    
  } catch (error) {
    console.error('Finale auth test error:', error)
    return apiResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      debug: { 
        errorType: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 })
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})