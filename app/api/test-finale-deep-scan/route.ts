import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('[Deep Scan] Starting deep scan for supplier fields...')
    
    // Get Finale config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    // Initialize auth
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    // Get more products to analyze
    const productUrl = `${baseUrl}/product?limit=20`
    
    console.log('[Deep Scan] Fetching 20 products for analysis...')
    
    const response = await fetch(productUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: `Finale API error: ${response.status}`,
        details: errorText.substring(0, 500)
      }, { status: response.status })
    }

    const rawData = await response.json()
    
    // Deep analysis
    const analysis = {
      totalProducts: rawData.productId ? rawData.productId.length : 0,
      columnsWithData: {},
      supplier1Fields: {},
      vendorRelatedData: {},
      userFieldPatterns: {}
    }
    
    // Check each column for non-empty data
    Object.keys(rawData).forEach(column => {
      if (Array.isArray(rawData[column])) {
        const nonEmptyCount = rawData[column].filter(val => {
          if (Array.isArray(val)) return val.length > 0
          if (typeof val === 'object' && val !== null) return Object.keys(val).length > 0
          return val !== null && val !== '' && val !== undefined
        }).length
        
        if (nonEmptyCount > 0) {
          analysis.columnsWithData[column] = {
            count: nonEmptyCount,
            percentage: ((nonEmptyCount / rawData[column].length) * 100).toFixed(1) + '%'
          }
        }
      }
    })
    
    // Check for supplier1, vendor1 patterns in ANY field
    const searchPatterns = [
      /supplier\d+/i,
      /vendor\d+/i,
      /supplier1/i,
      /vendor1/i,
      /primarysupplier/i,
      /primaryvendor/i
    ]
    
    // Scan all data for supplier patterns
    Object.keys(rawData).forEach(column => {
      if (Array.isArray(rawData[column])) {
        rawData[column].forEach((value, index) => {
          // Check if value is an object that might contain supplier fields
          if (typeof value === 'object' && value !== null) {
            Object.keys(value).forEach(key => {
              searchPatterns.forEach(pattern => {
                if (pattern.test(key)) {
                  if (!analysis.supplier1Fields[key]) {
                    analysis.supplier1Fields[key] = []
                  }
                  analysis.supplier1Fields[key].push({
                    productIndex: index,
                    productId: rawData.productId?.[index],
                    value: value[key]
                  })
                }
              })
            })
          }
          
          // Check string values for supplier references
          if (typeof value === 'string' && value.length > 0) {
            searchPatterns.forEach(pattern => {
              if (pattern.test(value)) {
                if (!analysis.vendorRelatedData[column]) {
                  analysis.vendorRelatedData[column] = []
                }
                analysis.vendorRelatedData[column].push({
                  productIndex: index,
                  productId: rawData.productId?.[index],
                  value: value
                })
              }
            })
          }
        })
      }
    })
    
    // Analyze userFieldDataList for patterns
    if (rawData.userFieldDataList && Array.isArray(rawData.userFieldDataList)) {
      rawData.userFieldDataList.forEach((fieldList, productIndex) => {
        if (Array.isArray(fieldList)) {
          fieldList.forEach(field => {
            if (field.attrName && field.attrValue) {
              if (!analysis.userFieldPatterns[field.attrName]) {
                analysis.userFieldPatterns[field.attrName] = {
                  count: 0,
                  sampleValues: []
                }
              }
              analysis.userFieldPatterns[field.attrName].count++
              if (analysis.userFieldPatterns[field.attrName].sampleValues.length < 3) {
                analysis.userFieldPatterns[field.attrName].sampleValues.push({
                  productId: rawData.productId?.[productIndex],
                  value: field.attrValue
                })
              }
            }
          })
        }
      })
    }
    
    // Try to find ANY vendor/supplier data in first few products
    const sampleProducts = []
    for (let i = 0; i < Math.min(5, analysis.totalProducts); i++) {
      const product = {}
      Object.keys(rawData).forEach(key => {
        if (Array.isArray(rawData[key]) && rawData[key][i] !== undefined) {
          // Only include non-empty values
          const value = rawData[key][i]
          if (value !== null && value !== '' && value !== undefined) {
            if (Array.isArray(value) && value.length === 0) return
            if (typeof value === 'object' && Object.keys(value).length === 0) return
            product[key] = value
          }
        }
      })
      sampleProducts.push(product)
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      sampleProducts,
      recommendation: analysis.supplier1Fields && Object.keys(analysis.supplier1Fields).length > 0
        ? 'Found supplier1 fields! Update code to extract from these fields.'
        : 'No supplier1 fields found. Vendor data may need to be added in Finale.'
    })
    
  } catch (error) {
    console.error('[Deep Scan] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}