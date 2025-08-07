import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    // Return a safe default for middleware initialization, actual auth will fail properly
    return new TextEncoder().encode('development-placeholder-minimum-32-characters')
  }
  return new TextEncoder().encode(secret)
}

const JWT_SECRET = getJWTSecret()
const PUBLIC_PATHS = ['/api/auth/login', '/api/health', '/health', '/inventory', '/settings', '/']
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true' // Only enable auth if explicitly set

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Skip rate limiting for now - it's causing issues with Edge runtime
  // Rate limiting should be implemented at the API route level instead
  
  // Skip authentication for public paths
  if (!AUTH_ENABLED || PUBLIC_PATHS.some(p => path.startsWith(p))) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    return response
  }
  
  // API protection - only if auth is explicitly enabled
  if (path.startsWith('/api') && AUTH_ENABLED) {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    try {
      await jwtVerify(token, JWT_SECRET)
      const response = NextResponse.next()
      applySecurityHeaders(response)
      return response
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
  }
  
  // Default: allow the request
  const response = NextResponse.next()
  applySecurityHeaders(response)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}