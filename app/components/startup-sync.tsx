'use client'

import { useEffect } from 'react'
import { checkInitialSync, startAutoSync } from '@/app/lib/auto-sync-manager'

export function StartupSync() {
  useEffect(() => {
    // Run initial sync check
    checkInitialSync().then(() => {
      // Start auto-sync after initial check
      startAutoSync()
    })
    
    // Cleanup on unmount
    return () => {
      // Auto-sync will continue running
      // Only stop if you need to for some reason
    }
  }, [])
  
  return null // This component doesn't render anything
}