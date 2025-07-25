/**
 * CSRF Protection for API routes
 * Implements double-submit cookie pattern with encrypted tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Secret for token encryption (should be in env vars)
const getSecret = () => {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('CSRF_SECRET must be at least 32 characters')
  }
  return secret
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
  const timestamp = Date.now().toString()
  const data = `${token}.${timestamp}`
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(data)
  const signature = hmac.digest('hex')
  
  return `${data}.${signature}`
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  if (!token) return false
  
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  const [tokenPart, timestamp, signature] = parts
  
  // Check token expiry
  const tokenTime = parseInt(timestamp)
  if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY) {
    return false
  }
  
  // Verify signature
  const data = `${tokenPart}.${timestamp}`
  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(data)
  const expectedSignature = hmac.digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Get CSRF token from request
 */
export function getCSRFToken(request: NextRequest): {
  cookieToken?: string
  headerToken?: string
} {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || undefined
  
  return { cookieToken, headerToken }
}

/**
 * CSRF middleware options
 */
export interface CSRFOptions {
  skip?: boolean
  generateNewToken?: boolean
  methods?: string[] // Methods to protect (default: ['POST', 'PUT', 'DELETE', 'PATCH'])
}

/**
 * Check CSRF protection
 */
export async function checkCSRF(
  request: NextRequest,
  options: CSRFOptions = {}
): Promise<{ valid: boolean; newToken?: string; error?: string }> {
  // Skip CSRF check if requested
  if (options.skip) {
    return { valid: true }
  }
  
  // Only check CSRF for state-changing methods
  const protectedMethods = options.methods || ['POST', 'PUT', 'DELETE', 'PATCH']
  if (!protectedMethods.includes(request.method)) {
    return { valid: true }
  }
  
  const { cookieToken, headerToken } = getCSRFToken(request)
  
  // For API routes, we use double-submit cookie pattern
  // Both cookie and header/body token must be present and match
  if (!cookieToken || !headerToken) {
    return {
      valid: false,
      error: 'CSRF token missing'
    }
  }
  
  // Tokens must match exactly
  if (cookieToken !== headerToken) {
    return {
      valid: false,
      error: 'CSRF token mismatch'
    }
  }
  
  // Validate token signature and expiry
  if (!validateCSRFToken(cookieToken)) {
    return {
      valid: false,
      error: 'Invalid or expired CSRF token'
    }
  }
  
  // Generate new token if requested (for token rotation)
  if (options.generateNewToken) {
    const newToken = generateCSRFToken()
    return { valid: true, newToken }
  }
  
  return { valid: true }
}

/**
 * Create CSRF error response
 */
export function csrfError(error: string = 'CSRF validation failed'): NextResponse {
  return NextResponse.json(
    {
      error,
      code: 'CSRF_VALIDATION_FAILED'
    },
    { status: 403 }
  )
}

/**
 * Set CSRF cookie on response
 */
export function setCSRFCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  })
}

/**
 * Middleware to add CSRF token to response
 */
export function withCSRFToken(response: NextResponse): NextResponse {
  const token = generateCSRFToken()
  setCSRFCookie(response, token)
  
  // Also add to response header for easy access
  response.headers.set('X-CSRF-Token', token)
  
  return response
}

/**
 * Hook for client-side CSRF token management
 * This would be used in a React component
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  
  const match = document.cookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

/**
 * Add CSRF token to fetch headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFTokenFromCookie()
  if (!token) return headers
  
  if (headers instanceof Headers) {
    headers.set(CSRF_HEADER_NAME, token)
    return headers
  }
  
  return {
    ...headers,
    [CSRF_HEADER_NAME]: token
  }
}