/**
 * Client-side fetch utility with automatic CSRF token inclusion
 */

import { getCSRFTokenFromCookie, addCSRFHeader } from './csrf'

export interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  includeCSRF?: boolean // Default: true for state-changing methods
}

/**
 * Enhanced fetch that automatically includes CSRF tokens
 */
export async function clientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    headers = {},
    includeCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET'),
    ...restOptions
  } = options

  // Prepare headers
  let finalHeaders: HeadersInit = { ...headers }
  
  // Add CSRF token if needed
  if (includeCSRF) {
    finalHeaders = addCSRFHeader(finalHeaders)
  }
  
  // Always include credentials for cookie-based auth
  const response = await fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    credentials: 'include'
  })
  
  // If CSRF token is invalid, try to refresh and retry once
  if (response.status === 403) {
    const data = await response.json().catch(() => null)
    if (data?.code === 'CSRF_VALIDATION_FAILED') {
      // Fetch new CSRF token
      await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      
      // Retry the original request with new token
      finalHeaders = addCSRFHeader({ ...headers })
      return fetch(url, {
        ...restOptions,
        headers: finalHeaders,
        credentials: 'include'
      })
    }
  }
  
  return response
}

/**
 * Typed fetch wrapper with JSON parsing
 */
export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await clientFetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      return { error: errorData.error || `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    return { data: data.data || data }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Network error' 
    }
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(url: string, options?: Omit<FetchOptions, 'method'>) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  put: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  patch: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  delete: <T = any>(url: string, options?: Omit<FetchOptions, 'method'>) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' })
}

/**
 * Example usage:
 * 
 * // Simple GET request
 * const { data, error } = await api.get('/api/inventory')
 * 
 * // POST request with body
 * const { data, error } = await api.post('/api/inventory', {
 *   sku: 'ABC123',
 *   quantity: 100
 * })
 * 
 * // Custom headers
 * const { data, error } = await api.get('/api/inventory', {
 *   headers: { 'X-Custom-Header': 'value' }
 * })
 */