import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-in-production')
const PUBLIC_PATHS = ['/api/auth/login', '/api/health', '/health']

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
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Apply security headers
  applySecurityHeaders(response)

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