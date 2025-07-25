'use client'

import { ReactNode } from 'react'
import FilteringErrorBoundary from './FilteringErrorBoundary'

interface SafeFilteredInventoryProps {
  children: ReactNode
  allItems: any[]
  onError?: (error: Error) => void
}

/**
 * Wrapper component that provides error boundary protection for inventory filtering.
 * If filtering fails, it will display an error message but keep the app functional.
 */
export default function SafeFilteredInventory({ 
  children, 
  allItems,
  onError 
}: SafeFilteredInventoryProps) {
  return (
    <FilteringErrorBoundary fallbackItems={allItems}>
      {children}
    </FilteringErrorBoundary>
  )
}