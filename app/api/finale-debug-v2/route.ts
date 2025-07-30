import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = createApiHandler(async ({ body }) => {
  const startTime = Date.now()
  const results = []
  
  try {
    const settings = body
    
    console.log('=== FINALE DEBUG V2 ===')
    console.log('Received settings:', {
      hasApiKey: !!settings.finale_api_key,
      hasApiSecret: !!settings.finale_api_secret,
      hasUsername: !!settings.finale_username,
      hasPassword: !!settings.finale_password,
      accountPath: settings.finale_account_path
    })
    
    // Clean account path
    const accountPath = (settings.finale_account_path || '')
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()
    
    console.log('Cleaned account path:', accountPath)
    
    // Test 1: Check if account path looks correct
    if (accountPath === 'app' || accountPath === '') {
      results.push({
        test: 'Account Path Validation',
        success: false,
        error: 'Account path appears to be incorrect. Should be something like "buildasoilorganics"',
        recommendation: 'Check your Finale URL and extract the account identifier'
      })
    } else {
      results.push({
        test: 'Account Path Validation',
        success: true,
        message: `Account path "${accountPath}" looks valid`
      })
    }
    
    // Test 2: Try API Key authentication if provided
    if (settings.finale_api_key && settings.finale_api_secret) {
      console.log('Testing API Key authentication...')
      
      const authString = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
      const apiUrl = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'BuildASoil-Inventory/1.0'
          }
        })
        
        const responseText = await response.text()
        console.log('API Response Status:', response.status)
        console.log('API Response Headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          try {
            const data = JSON.parse(responseText)
            results.push({
              test: 'API Key Authentication',
              success: true,
              message: 'Successfully authenticated with API key',
              details: {
                url: apiUrl,
                status: response.status,
                dataReceived: Array.isArray(data) ? `${data.length} products` : 'Data received'
              }
            })
          } catch (e) {
            results.push({
              test: 'API Key Authentication',
              success: true,
              message: 'Authenticated but response parsing failed',
              details: {
                url: apiUrl,
                status: response.status,
                parseError: e instanceof Error ? e.message : String(e)
              }
            })
          }
        } else {
          results.push({
            test: 'API Key Authentication',
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: {
              url: apiUrl,
              response: responseText.substring(0, 200)
            },
            recommendation: 'Check API credentials in Finale Settings > Integrations > API'
          })
        }
      } catch (error) {
        console.error('API Key test error:', error)
        results.push({
          test: 'API Key Authentication',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: { url: apiUrl },
          recommendation: 'Network error - check internet connection'
        })
      }
    }
    
    // Test 3: Try username/password authentication if provided
    if (settings.finale_username && settings.finale_password) {
      console.log('Testing Username/Password authentication...')
      
      // Try the standard auth endpoint
      const authUrl = `https://app.finaleinventory.com/${accountPath}/j_spring_security_check`
      
      try {
        const formData = new URLSearchParams({
          j_username: settings.finale_username,
          j_password: settings.finale_password
        })
        
        const response = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'User-Agent': 'BuildASoil-Inventory/1.0'
          },
          body: formData.toString(),
          redirect: 'manual'
        })
        
        console.log('Session Auth Response Status:', response.status)
        console.log('Session Auth Headers:', Object.fromEntries(response.headers.entries()))
        
        const cookies = response.headers.get('set-cookie')
        const location = response.headers.get('location')
        
        if (response.status === 302 || response.status === 303 || cookies?.includes('JSESSIONID')) {
          results.push({
            test: 'Username/Password Authentication',
            success: true,
            message: 'Successfully authenticated with username/password',
            details: {
              url: authUrl,
              status: response.status,
              hasSessionCookie: !!cookies,
              redirectLocation: location
            }
          })
          
          // If we have a session, try to access the API
          if (cookies) {
            const sessionMatch = cookies.match(/JSESSIONID=([^;]+)/)
            if (sessionMatch) {
              const testApiUrl = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`
              
              try {
                const apiResponse = await fetch(testApiUrl, {
                  headers: {
                    'Cookie': `JSESSIONID=${sessionMatch[1]}`,
                    'Accept': 'application/json'
                  }
                })
                
                results.push({
                  test: 'Session API Access',
                  success: apiResponse.ok,
                  message: apiResponse.ok ? 'Can access API with session' : 'Cannot access API with session',
                  details: {
                    url: testApiUrl,
                    status: apiResponse.status
                  }
                })
              } catch (e) {
                console.error('Session API test error:', e)
              }
            }
          }
        } else {
          const responseText = await response.text()
          results.push({
            test: 'Username/Password Authentication',
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: {
              url: authUrl,
              responsePreview: responseText.substring(0, 200)
            },
            recommendation: 'Check username and password are correct'
          })
        }
      } catch (error) {
        console.error('Session auth test error:', error)
        results.push({
          test: 'Username/Password Authentication',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: { url: authUrl },
          recommendation: 'Network error or invalid endpoint'
        })
      }
    }
    
    // Test 4: Check if we can access the public URL
    try {
      const publicUrl = `https://app.finaleinventory.com/${accountPath}/`
      const response = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'BuildASoil-Inventory/1.0'
        }
      })
      
      results.push({
        test: 'Public URL Access',
        success: response.ok,
        message: response.ok ? 'Account URL is accessible' : 'Cannot access account URL',
        details: {
          url: publicUrl,
          status: response.status
        }
      })
    } catch (error) {
      console.error('Public URL test error:', error)
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length
    const totalTests = results.length
    
    console.log(`\n=== FINALE DEBUG SUMMARY ===`)
    console.log(`Tests passed: ${successCount}/${totalTests}`)
    console.log('Duration:', Date.now() - startTime, 'ms')
    results.forEach(r => {
      console.log(`${r.success ? '✓' : '✗'} ${r.test}:`, r.message || r.error)
    })
    
    return apiResponse({
      success: successCount > 0,
      summary: {
        testsRun: totalTests,
        testsPassed: successCount,
        duration: Date.now() - startTime
      },
      accountPath: {
        original: settings.finale_account_path,
        cleaned: accountPath
      },
      results,
      recommendations: results
        .filter(r => !r.success && r.recommendation)
        .map(r => r.recommendation)
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return apiResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})