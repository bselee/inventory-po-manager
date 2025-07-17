import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export async function GET() {
  try {
    console.log('[Test Sync] Starting comprehensive sync test...')
    
    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured',
        recommendation: 'Please configure Finale API credentials in settings'
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)
    const results = {
      connection: { success: false, message: '' },
      inventory: { success: false, message: '', details: {} },
      vendors: { success: false, message: '', details: {} }
    }

    // Test 1: Connection test
    console.log('[Test Sync] Testing Finale connection...')
    try {
      const isConnected = await finaleApi.testConnection()
      results.connection = {
        success: isConnected,
        message: isConnected ? 'Successfully connected to Finale API' : 'Failed to connect to Finale API'
      }
    } catch (error) {
      results.connection = {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    // Test 2: Inventory fetch (limited to 5 items for testing)
    if (results.connection.success) {
      console.log('[Test Sync] Testing inventory fetch...')
      try {
        const testUrl = `${finaleApi['baseUrl']}/product?limit=5`
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': finaleApi['authHeader'],
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const isArray = Array.isArray(data)
          const itemCount = isArray ? data.length : (data.products ? data.products.length : 0)
          
          results.inventory = {
            success: true,
            message: `Successfully fetched ${itemCount} inventory items`,
            details: {
              responseType: isArray ? 'array' : 'object',
              sampleItem: isArray ? data[0] : (data.products ? data.products[0] : null),
              currentYearFilter: 'Will filter by current year when syncing'
            }
          }
        } else {
          const errorText = await response.text()
          results.inventory = {
            success: false,
            message: `Inventory API error: ${response.status}`,
            details: { error: errorText.substring(0, 200) }
          }
        }
      } catch (error) {
        results.inventory = {
          success: false,
          message: `Inventory fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: {}
        }
      }
    }

    // Test 3: Vendor fetch (limited to 5 items for testing)
    if (results.connection.success) {
      console.log('[Test Sync] Testing vendor fetch...')
      try {
        const testUrl = `${finaleApi['baseUrl']}/vendor?limit=5`
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': finaleApi['authHeader'],
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const isArray = Array.isArray(data)
          const itemCount = isArray ? data.length : (data.vendors ? data.vendors.length : 0)
          
          results.vendors = {
            success: true,
            message: `Successfully fetched ${itemCount} vendors`,
            details: {
              responseType: isArray ? 'array' : 'object',
              sampleVendor: isArray ? data[0] : (data.vendors ? data.vendors[0] : null)
            }
          }
        } else {
          const errorText = await response.text()
          results.vendors = {
            success: false,
            message: `Vendor API error: ${response.status}`,
            details: { error: errorText.substring(0, 200) }
          }
        }
      } catch (error) {
        results.vendors = {
          success: false,
          message: `Vendor fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: {}
        }
      }
    }

    // Overall status
    const allSuccess = results.connection.success && results.inventory.success && results.vendors.success
    
    console.log('[Test Sync] Test completed:', {
      connection: results.connection.success,
      inventory: results.inventory.success,
      vendors: results.vendors.success
    })

    return NextResponse.json({
      success: allSuccess,
      summary: allSuccess 
        ? 'All Finale sync tests passed! You can now sync inventory and vendors.'
        : 'Some tests failed. Please check the details below.',
      results,
      recommendations: [
        !results.connection.success && 'Check your Finale API credentials and account path',
        !results.inventory.success && results.connection.success && 'Inventory endpoint may have different response format',
        !results.vendors.success && results.connection.success && 'Vendor endpoint may have different response format'
      ].filter(Boolean)
    })
    
  } catch (error) {
    console.error('[Test Sync] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'An unexpected error occurred during testing'
    }, { status: 500 })
  }
}