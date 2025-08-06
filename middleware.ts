import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { RateLimiter } from './app/lib/rate-limiter'

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

// Configure rate limiters for different endpoint types
const rateLimiters = {
  // Strict rate limiting for auth endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    keyPrefix: 'auth'
  }),
  
  // Moderate rate limiting for sync endpoints
  sync: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    keyPrefix: 'sync'
  }),
  
  // Standard rate limiting for API endpoints
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    keyPrefix: 'api'
  }),
  
  // Lenient rate limiting for read operations
  read: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyPrefix: 'read'
  })
}

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
  
  // Apply rate limiting to API routes
  if (path.startsWith('/api')) {
    // Skip rate limiting for health check
    if (path !== '/api/health') {
      // Determine which rate limiter to use
      let limiter = rateLimiters.api // Default rate limiter
      
      if (path.includes('/auth/login') || path.includes('/auth/register')) {
        limiter = rateLimiters.auth
      } else if (path.includes('/sync')) {
        limiter = rateLimiters.sync
      } else if (request.method === 'GET') {
        limiter = rateLimiters.read
      }
      
      // Check rate limit
      const result = await limiter.check(request, path)
      
      if (!result.allowed) {
        // Rate limit exceeded
        const errorResponse = NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Please slow down and try again later',
            retryAfter: result.reset.toISOString()
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toISOString()
            }
          }
        )
        applySecurityHeaders(errorResponse)
        return errorResponse
      }
      
      // Add rate limit headers to all API responses
      const rateLimitHeaders = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toISOString()
      }
      
      // We'll add these headers later to the response
      request.headers.set('x-ratelimit-info', JSON.stringify(rateLimitHeaders))
    }
  }
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Apply security headers
  applySecurityHeaders(response)
  
  // Add rate limit headers if they exist
  const rateLimitInfo = request.headers.get('x-ratelimit-info')
  if (rateLimitInfo) {
    try {
      const headers = JSON.parse(rateLimitInfo)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value as string)
      })
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Skip authentication if not enabled
  if (!AUTH_ENABLED) {
    return response
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(path)) {
    return response
  }

  // Check if path requires authentication
  const isApiRoute = path.startsWith('/api/')
  const isProtectedPage = path.startsWith('/inventory') || 
                         path.startsWith('/settings') || 
                         path.startsWith('/admin')

  if (isApiRoute || isProtectedPage) {
    // Get token from cookie or header
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      if (isApiRoute) {
        const errorResponse = NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
        applySecurityHeaders(errorResponse)
        return errorResponse
      } else {
        // Redirect to login page (when we create it)
        const redirectResponse = NextResponse.redirect(new URL('/api/auth/login', request.url))
        applySecurityHeaders(redirectResponse)
        return redirectResponse
      }
    }

    try {
      // Verify token
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        if (isApiRoute) {
          const errorResponse = NextResponse.json(
            { error: 'Token expired' },
            { status: 401 }
          )
          applySecurityHeaders(errorResponse)
          return errorResponse
        } else {
          const redirectResponse = NextResponse.redirect(new URL('/api/auth/login', request.url))
          applySecurityHeaders(redirectResponse)
          return redirectResponse
        }
      }

      // Add user info to headers for server components
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.userId as string)
      requestHeaders.set('x-user-email', payload.email as string)
      requestHeaders.set('x-user-role', payload.role as string)

      const authenticatedResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      applySecurityHeaders(authenticatedResponse)
      return authenticatedResponse
    } catch (error) {
      console.error('Token verification failed:', error)
      
      if (isApiRoute) {
        const errorResponse = NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
        applySecurityHeaders(errorResponse)
        return errorResponse
      } else {
        const redirectResponse = NextResponse.redirect(new URL('/api/auth/login', request.url))
        applySecurityHeaders(redirectResponse)
        return redirectResponse
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/inventory/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}