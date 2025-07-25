import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createApiHandler(async () => {
  try {
    // Check if environment variables are set
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check if they're placeholder values
    const urlIsPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('[YOUR-PASSWORD]')
    const keyIsPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your_supabase_anon_key'
    
    // Try to query settings table
    let dbTest = { success: false, error: null, hasData: false }
    try {
      const { data, error, count } = await supabase
        .from('settings')
        .select('id', { count: 'exact', head: true })
      
      dbTest = {
        success: !error,
        error: error?.message || null,
        hasData: (count || 0) > 0
      }
    } catch (e) {
      dbTest.error = e instanceof Error ? e.message : 'Unknown error'
    }
    
    return apiResponse({
      environment: {
        hasUrl,
        hasKey,
        urlIsPlaceholder,
        keyIsPlaceholder,
        urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...'
      },
      database: dbTest,
      diagnosis: {
        configured: hasUrl && hasKey && !urlIsPlaceholder && !keyIsPlaceholder,
        issue: urlIsPlaceholder || keyIsPlaceholder 
          ? 'Using placeholder credentials - need real Supabase credentials'
          : !hasUrl || !hasKey
          ? 'Missing Supabase environment variables'
          : dbTest.error
          ? `Database connection error: ${dbTest.error}`
          : 'Configuration looks good'
      }
    })
  } catch (error) {
    return apiResponse({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}, {
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.ADMIN_ACCESS]
})