import { useState, useEffect } from 'react'
import { logError } from '@/app/lib/logger'

export type DataSource = 'supabase' | 'redis-cache' | 'finale-cache' | 'enhanced'

interface UseInventoryDataSourceResult {
  dataSource: DataSource
  isLoading: boolean
  error: string | null
}

export function useInventoryDataSource(): UseInventoryDataSourceResult {
  const [dataSource, setDataSource] = useState<DataSource>('redis-cache')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchDataSource = async () => {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) {
          throw new Error('Failed to fetch settings')
        }
        
        const data = await response.json()
        const source = data.data?.inventory_data_source || 'redis-cache'
        setDataSource(source as DataSource)
      } catch (err) {
        logError('Error fetching data source:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        // Default to redis-cache on error
        setDataSource('redis-cache')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDataSource()
  }, [])
  
  return { dataSource, isLoading, error }
}

// Helper function to get the correct API endpoint based on data source
export function getInventoryEndpoint(dataSource: DataSource): string {
  switch (dataSource) {
    case 'redis-cache':
      return '/api/inventory-kv'
    case 'finale-cache':
      return '/api/inventory/cache'
    case 'enhanced':
      return '/api/inventory-enhanced'
    case 'supabase':
    default:
      return '/api/inventory'
  }
}