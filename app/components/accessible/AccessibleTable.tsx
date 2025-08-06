import React, { useState, useRef, useEffect } from 'react'
import { AriaAnnouncer } from '@/app/lib/accessibility/wcag-compliance'
import { cn } from '@/app/lib/utils'

interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  ariaLabel?: string
}

interface AccessibleTableProps<T> {
  data: T[]
  columns: Column<T>[]
  caption: string
  sortable?: boolean
  selectable?: boolean
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onSelect?: (items: T[]) => void
  rowKey: (item: T) => string
  className?: string
  emptyMessage?: string
}

export default function AccessibleTable<T>({
  data,
  columns,
  caption,
  sortable = false,
  selectable = false,
  onSort,
  onSelect,
  rowKey,
  className,
  emptyMessage = 'No data available'
}: AccessibleTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  
  // Handle sorting
  const handleSort = (column: string) => {
    if (!sortable || !onSort) return
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(column)
    setSortDirection(newDirection)
    onSort(column, newDirection)
    
    AriaAnnouncer.announce(
      `Table sorted by ${column} in ${newDirection === 'asc' ? 'ascending' : 'descending'} order`
    )
  }
  
  // Handle row selection
  const handleRowSelect = (key: string) => {
    if (!selectable) return
    
    const newSelected = new Set(selectedRows)
    if (newSelected.has(key)) {
      newSelected.delete(key)
      AriaAnnouncer.announce('Row deselected')
    } else {
      newSelected.add(key)
      AriaAnnouncer.announce('Row selected')
    }
    
    setSelectedRows(newSelected)
    
    if (onSelect) {
      const selectedItems = data.filter(item => newSelected.has(rowKey(item)))
      onSelect(selectedItems)
    }
  }
  
  // Handle select all
  const handleSelectAll = () => {
    if (!selectable) return
    
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
      AriaAnnouncer.announce('All rows deselected')
      if (onSelect) onSelect([])
    } else {
      const allKeys = new Set(data.map(rowKey))
      setSelectedRows(allKeys)
      AriaAnnouncer.announce('All rows selected')
      if (onSelect) onSelect(data)
    }
  }
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current) return
      
      const cells = tableRef.current.querySelectorAll('td, th')
      const currentIndex = focusedCell ? focusedCell.row * columns.length + focusedCell.col : -1
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          if (currentIndex < cells.length - 1) {
            const nextIndex = currentIndex + 1
            const nextRow = Math.floor(nextIndex / columns.length)
            const nextCol = nextIndex % columns.length
            setFocusedCell({ row: nextRow, col: nextCol })
            ;(cells[nextIndex] as HTMLElement).focus()
          }
          break
          
        case 'ArrowLeft':
          e.preventDefault()
          if (currentIndex > 0) {
            const prevIndex = currentIndex - 1
            const prevRow = Math.floor(prevIndex / columns.length)
            const prevCol = prevIndex % columns.length
            setFocusedCell({ row: prevRow, col: prevCol })
            ;(cells[prevIndex] as HTMLElement).focus()
          }
          break
          
        case 'ArrowDown':
          e.preventDefault()
          if (focusedCell && focusedCell.row < data.length) {
            const nextRow = focusedCell.row + 1
            setFocusedCell({ row: nextRow, col: focusedCell.col })
            const nextIndex = nextRow * columns.length + focusedCell.col
            if (cells[nextIndex]) {
              ;(cells[nextIndex] as HTMLElement).focus()
            }
          }
          break
          
        case 'ArrowUp':
          e.preventDefault()
          if (focusedCell && focusedCell.row > 0) {
            const prevRow = focusedCell.row - 1
            setFocusedCell({ row: prevRow, col: focusedCell.col })
            const prevIndex = prevRow * columns.length + focusedCell.col
            if (cells[prevIndex]) {
              ;(cells[prevIndex] as HTMLElement).focus()
            }
          }
          break
          
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault()
            setFocusedCell({ row: 0, col: 0 })
            ;(cells[0] as HTMLElement).focus()
          }
          break
          
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault()
            const lastRow = data.length
            const lastCol = columns.length - 1
            setFocusedCell({ row: lastRow, col: lastCol })
            ;(cells[cells.length - 1] as HTMLElement).focus()
          }
          break
      }
    }
    
    if (tableRef.current) {
      tableRef.current.addEventListener('keydown', handleKeyDown)
      return () => {
        tableRef.current?.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [focusedCell, data.length, columns.length])
  
  // Get sort icon
  const getSortIcon = (column: string) => {
    if (!sortable) return null
    
    if (sortColumn !== column) {
      return (
        <span className="ml-2 text-gray-400" aria-hidden="true">
          ↕
        </span>
      )
    }
    
    return (
      <span className="ml-2 text-gray-700" aria-hidden="true">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }
  
  // Get aria-sort value
  const getAriaSort = (column: string): 'ascending' | 'descending' | 'none' => {
    if (sortColumn !== column) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }
  
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table
        ref={tableRef}
        className="min-w-full divide-y divide-gray-200"
        role="table"
        aria-label={caption}
        aria-rowcount={data.length + 1} // +1 for header
      >
        <caption className="sr-only">{caption}</caption>
        
        <thead className="bg-gray-50">
          <tr role="row" aria-rowindex={1}>
            {selectable && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
            )}
            
            {columns.map((column, index) => (
              <th
                key={column.key as string}
                scope="col"
                className={cn(
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  sortable && column.sortable && 'cursor-pointer select-none'
                )}
                onClick={() => column.sortable && handleSort(column.key as string)}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    handleSort(column.key as string)
                  }
                }}
                tabIndex={sortable && column.sortable ? 0 : -1}
                role={sortable && column.sortable ? 'button' : undefined}
                aria-sort={column.sortable ? getAriaSort(column.key as string) : undefined}
                aria-label={column.ariaLabel || column.header}
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable && getSortIcon(column.key as string)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-6 py-4 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => {
              const key = rowKey(item)
              const isSelected = selectedRows.has(key)
              
              return (
                <tr
                  key={key}
                  role="row"
                  aria-rowindex={rowIndex + 2} // +2 for header
                  aria-selected={selectable ? isSelected : undefined}
                  className={cn(
                    'hover:bg-gray-50',
                    isSelected && 'bg-indigo-50'
                  )}
                >
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(key)}
                        aria-label={`Select row ${rowIndex + 1}`}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  
                  {columns.map((column, colIndex) => (
                    <td
                      key={`${key}-${column.key as string}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      tabIndex={-1}
                    >
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}