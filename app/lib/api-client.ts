/**
 * API Client for making authenticated requests
 */

interface ApiClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private credentials: RequestCredentials

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    this.credentials = options.credentials || 'same-origin'
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.defaultHeaders,
      credentials: this.credentials
    })

    return this.handleResponse<T>(response)
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.defaultHeaders,
      credentials: this.credentials,
      body: data ? JSON.stringify(data) : undefined
    })

    return this.handleResponse<T>(response)
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      credentials: this.credentials,
      body: data ? JSON.stringify(data) : undefined
    })

    return this.handleResponse<T>(response)
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.defaultHeaders,
      credentials: this.credentials
    })

    return this.handleResponse<T>(response)
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.defaultHeaders,
      credentials: this.credentials,
      body: data ? JSON.stringify(data) : undefined
    })

    return this.handleResponse<T>(response)
  }

  // Set auth token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // Remove auth token
  clearAuthToken() {
    delete this.defaultHeaders['Authorization']
  }
}

// Create default instance
export const apiClient = new ApiClient({
  baseUrl: '/api'
})

// Export class for custom instances
export { ApiClient }