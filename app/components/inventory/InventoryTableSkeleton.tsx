'use client'

import React from 'react'

export default function InventoryTableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(7)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(7)].map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
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

export function FilterPanelSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
