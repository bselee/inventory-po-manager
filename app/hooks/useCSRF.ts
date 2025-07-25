/**
 * React hook for CSRF token management
 */

import { useState, useEffect, useCallback } from 'react'
import { getCSRFTokenFromCookie, addCSRFHeader } from '@/app/lib/csrf'

export interface UseCSRFOptions {
  autoRefresh?: boolean // Automatically refresh token on expiry
  refreshInterval?: number // Token refresh interval in ms (default: 23 hours)
}

export function useCSRF(options: UseCSRFOptions = {}) {
  const { autoRefresh = true, refreshInterval = 23 * 60 * 60 * 1000 } = options
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch CSRF token from server
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // GET request to any API endpoint will set CSRF cookie
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }
      
      // Get token from cookie
      const cookieToken = getCSRFTokenFromCookie()
      if (cookieToken) {
        setToken(cookieToken)
      } else {
        throw new Error('CSRF token not found in cookie')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial token fetch
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  // Auto-refresh token
  useEffect(() => {
    if (!autoRefresh || !token) return
    
    const intervalId = setInterval(() => {
      fetchToken()
    }, refreshInterval)
    
    return () => clearInterval(intervalId)
  }, [autoRefresh, token, refreshInterval, fetchToken])

  // Enhanced fetch with CSRF token
  const secureFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!token) {
      throw new Error('CSRF token not available')
    }
    
    const headers = addCSRFHeader(options.headers)
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Always include cookies
    })
  }, [token])

  return {
    token,
    loading,
    error,
    fetchToken,
    secureFetch
  }
}

/**
 * Example usage in a component:
 * 
 * function MyComponent() {
 *   const { token, loading, error, secureFetch } = useCSRF()
 *   
 *   const handleSubmit = async (data) => {
 *     try {
 *       const response = await secureFetch('/api/items', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify(data)
 *       })
 *       // Handle response
 *     } catch (error) {
 *       // Handle error
 *     }
 *   }
 * }
 */