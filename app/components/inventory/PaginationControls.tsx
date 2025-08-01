'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Package, MoreHorizontal } from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  filteredCount: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  className?: string
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  filteredCount,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  className = ''
}: PaginationControlsProps) {
  const [jumpToPage, setJumpToPage] = useState('')

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage)
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
      setJumpToPage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }

  // Generate page numbers to show
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // Total pages to show
    const sidePages = Math.floor(showPages / 2)

    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - sidePages)
      let end = Math.min(totalPages - 1, currentPage + sidePages)

      // Adjust if we're near the beginning
      if (currentPage <= sidePages + 1) {
        end = showPages - 1
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - sidePages) {
        start = totalPages - showPages + 2
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis')
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }

      // Always show last page if it's not already included
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = generatePageNumbers()

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left side - Items info and per-page selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Items per page */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Items per page"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={9999}>All</option>
            </select>
            <span className="text-gray-600">items</span>
          </div>

          {/* Items range info */}
          <div className="text-sm text-gray-600">
            Showing {Math.min(startIndex + 1, filteredCount)}-{Math.min(endIndex, filteredCount)} of {filteredCount} items
            {filteredCount !== totalItems && (
              <span className="text-gray-500"> (filtered from {totalItems.toLocaleString()} total)</span>
            )}
          </div>
        </div>

        {/* Right side - Page navigation */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Jump to page */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Go to page:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`1-${totalPages}`}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Jump to page number"
              />
              <button
                onClick={handleJumpToPage}
                disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Go
              </button>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              {/* Previous button */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNum, index) => (
                  pageNum === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-gray-500">
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-600 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
