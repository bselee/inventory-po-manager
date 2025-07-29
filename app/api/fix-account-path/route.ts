import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Get current settings
    const { data: settings, error: fetchError } = await supabase
      .from('settings')
      .select('finale_account_path')
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch settings',
        details: fetchError.message 
      }, { status: 500 })
    }

    if (!settings?.finale_account_path) {
      return NextResponse.json({ 
        message: 'No account path to fix',
        current: null 
      })
    }

    const currentPath = settings.finale_account_path
    let fixedPath = currentPath

    // If path contains full URL, extract just the account part
    if (currentPath.includes('http')) {
      const match = currentPath.match(/finaleinventory\.com\/([^\/]+(?:\/\d+)?)/i)
      if (match) {
        fixedPath = match[1]
      } else {
        // Try another pattern
        const parts = currentPath.split('/')
        const accountIndex = parts.findIndex(p => p.includes('finaleinventory.com'))
        if (accountIndex >= 0 && parts[accountIndex + 1]) {
          fixedPath = parts[accountIndex + 1]
          // Check if there's a numeric ID after
          if (parts[accountIndex + 2] && /^\d+$/.test(parts[accountIndex + 2])) {
            fixedPath += '/' + parts[accountIndex + 2]
          }
        }
      }
    }

    // Update if changed
    if (fixedPath !== currentPath) {
      const { error: updateError } = await supabase
        .from('settings')
        .update({ finale_account_path: fixedPath })
        .eq('id', 1)

      if (updateError) {
        return NextResponse.json({ 
          error: 'Failed to update account path',
          details: updateError.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Account path fixed!',
        previous: currentPath,
        fixed: fixedPath
      })
    }

    return NextResponse.json({
      message: 'Account path is already correct',
      current: currentPath
    })

  } catch (error) {
    console.error('Error fixing account path:', error)
    return NextResponse.json({ 
      error: 'Failed to fix account path',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}