// lib/finale-session-api.ts
// Alternative Finale API client using session-based authentication (username/password)

import { supabase } from './supabase'

interface FinaleSessionConfig {
  username: string
  password: string
  accountPath: string
}

interface AuthResponse {
  sessionId: string
  sessionSecret: string
  resourceUrls: Record<string, string>
}

export class FinaleSessionApiService {
  private config: FinaleSessionConfig
  private baseUrl: string
  private sessionId: string | null = null
  private sessionSecret: string | null = null
  private cookieJar: string | null = null

  constructor(config: FinaleSessionConfig) {
    this.config = config
    // Clean the account path - remove any URL parts if provided
    const cleanPath = config.accountPath
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()
    this.baseUrl = `https://app.finaleinventory.com/${cleanPath}`
  }

  /**
   * Authenticate using username and password
   * This establishes a session that must be used for subsequent requests
   */
  async authenticate(): Promise<boolean> {
    try {
      const authUrl = `${this.baseUrl}/auth`
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password
        }),
        credentials: 'include' // Important for cookie handling
      })

      if (response.ok) {
        // Extract session cookie from response headers
        const setCookieHeader = response.headers.get('set-cookie')
        if (setCookieHeader) {
          // Extract JSESSIONID
          const sessionIdMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/)
          if (sessionIdMatch) {
            this.sessionId = sessionIdMatch[1]
            this.cookieJar = `JSESSIONID=${this.sessionId}`
          }
        }

        // Parse response body for session secret and resource URLs
        const authData = await response.json()
        if (authData.sessionSecret) {
          this.sessionSecret = authData.sessionSecret
        }
        return true
      } else {
        logError('Session authentication failed:', {
          status: response.status,
          statusText: response.statusText
        })
        return false
      }
    } catch (error) {
      logError('Session authentication error:', error)
      return false
    }
  }

  /**
   * Make an authenticated request using the session
   */
  private async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Call authenticate() first.')
    }

    const headers = {
      ...options.headers,
      'Cookie': this.cookieJar || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // For POST/PUT requests, include sessionSecret in body
    if (options.method === 'POST' || options.method === 'PUT') {
      const body = options.body ? JSON.parse(options.body as string) : {}
      body.sessionSecret = this.sessionSecret
      options.body = JSON.stringify(body)
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  }

  /**
   * Run a report and get results
   * @param reportId The ID of the report to run
   * @param format 'JSON' or 'CSV'
   * @param filters Optional filter parameters (will be base64 encoded)
   */
  async runReport(
    reportId: string, 
    format: 'JSON' | 'CSV' = 'JSON',
    filters?: Record<string, any>
  ) {
    if (!this.sessionId) {
      await this.authenticate()
    }

    let reportUrl = `${this.baseUrl}/report/${reportId}?format=${format}`
    
    // Add filters if provided
    if (filters) {
      const filterJson = JSON.stringify(filters)
      const filterBase64 = Buffer.from(filterJson).toString('base64')
      reportUrl += `&filter=${encodeURIComponent(filterBase64)}`
    }
    const response = await this.makeAuthenticatedRequest(reportUrl)
    
    if (response.ok) {
      if (format === 'JSON') {
        return await response.json()
      } else {
        return await response.text()
      }
    } else {
      throw new Error(`Failed to run report: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Get inventory data using session authentication
   */
  async getInventory(facilityName: string = 'Shipping', page: number = 1, limit: number = 100) {
    if (!this.sessionId) {
      await this.authenticate()
    }

    const url = `${this.baseUrl}/api/product?facility=${encodeURIComponent(facilityName)}&offset=${(page - 1) * limit}&limit=${limit}`
    
    const response = await this.makeAuthenticatedRequest(url)
    
    if (response.ok) {
      return await response.json()
    } else {
      throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Get all available reports
   */
  async getReportsList() {
    if (!this.sessionId) {
      await this.authenticate()
    }

    const url = `${this.baseUrl}/api/report`
    const response = await this.makeAuthenticatedRequest(url)
    
    if (response.ok) {
      return await response.json()
    } else {
      throw new Error(`Failed to fetch reports list: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Logout and clear session
   */
  async logout() {
    if (this.sessionId) {
      try {
        await this.makeAuthenticatedRequest(`${this.baseUrl}/logout`, {
          method: 'POST'
        })
      } catch (error) {
        logError('Logout error:', error)
      }
      
      this.sessionId = null
      this.sessionSecret = null
      this.cookieJar = null
    }
  }
}

/**
 * Helper function to get session config from database
 */
export async function getFinaleSessionConfig(): Promise<FinaleSessionConfig | null> {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('finale_username, finale_password, finale_account_path')
    .single()

  if (error || !settings) {
    logError('Failed to get Finale session config:', error)
    return null
  }

  if (!settings.finale_username || !settings.finale_password || !settings.finale_account_path) {
    logError('Missing Finale session credentials')
    return null
  }

  return {
    username: settings.finale_username,
    password: settings.finale_password,
    accountPath: settings.finale_account_path
  }
}