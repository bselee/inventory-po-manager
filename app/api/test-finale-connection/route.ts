import { NextResponse } from 'next/server'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config({ path: '.env' })

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/test-finale-connection - Test Finale API connection
export async function POST(request: Request) {
  try {
    const { apiKey, apiSecret, accountPath } = await request.json()
    
    // Validate inputs
    if (!apiKey || !apiSecret || !accountPath) {
      return NextResponse.json(
        { success: false, error: 'Missing required credentials' },
        { status: 400 }
      )
    }
    
    // Clean the account path (remove any URL parts if provided)
    const cleanAccountPath = accountPath
      .replace('https://', '')
      .replace('http://', '')
      .replace('app.finaleinventory.com/', '')
      .replace(/\/.*$/, '') // Remove any trailing paths
      .trim()
    
    // Test the connection with a simple API call
    const testUrl = `https://app.finaleinventory.com/${cleanAccountPath}/api/products?limit=1`
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    
    console.log('Testing Finale connection to:', testUrl)
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      // Try to parse the response to make sure it's valid JSON
      try {
        await response.json()
        return NextResponse.json({ 
          success: true,
          message: 'Connection successful! API credentials are valid.'
        })
      } catch (parseError) {
        // Response was OK but not JSON, might still be valid
        return NextResponse.json({ 
          success: true,
          message: 'Connection successful! (Non-JSON response received)'
        })
      }
    } else {
      // Provide helpful error messages based on status code
      let errorMessage = `Connection failed with status ${response.status}`
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid API credentials. Please check your API key and secret.'
      } else if (response.status === 404) {
        errorMessage = `Account path "${cleanAccountPath}" not found. Please check your account path.`
      } else if (response.status === 500) {
        errorMessage = 'Finale server error. Please try again later.'
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage
      })
    }
  } catch (error) {
    console.error('Connection test error:', error)
    
    // Handle network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return NextResponse.json({ 
          success: false,
          error: 'Network error. Please check your internet connection.'
        })
      }
      return NextResponse.json({ 
        success: false,
        error: `Connection failed: ${error.message}`
      })
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'An unexpected error occurred while testing the connection'
    })
  }
}