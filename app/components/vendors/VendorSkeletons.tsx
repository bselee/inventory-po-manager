'use client'

import React from 'react'

export function VendorCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-5 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-36"></div>
        <div className="h-4 bg-gray-200 rounded w-40"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 p-3 rounded">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <div className="h-3 bg-gray-200 rounded w-32"></div>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export function VendorListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Vendor', 'Contact', 'Email', 'Phone', 'Items', 'Total Spend', 'Last Order'].map((header, i) => (
                <th key={i} className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {/* Vendor name with avatar */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  </div>
                </td>
                {/* Other columns */}
                {[...Array(6)].map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function VendorPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="h-8 bg-gray-300 rounded w-32 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>

      {/* Search and View Controls Skeleton */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
          {/* View mode toggle */}
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
      </div>

      {/* Content Skeleton - Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <VendorCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}