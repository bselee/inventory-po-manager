import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { validateCredentials, createSession, logAuthEvent } from '@/app/lib/auth'
import { rateLimiters } from '@/app/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const POST = createApiHandler(async ({ body, request }) => {
  const { email, password } = body

  // Validate credentials
  const user = await validateCredentials(email, password)
  
  if (!user) {
    // Log failed login attempt
    await logAuthEvent(null, 'login_failed', request as NextRequest, { email })
    
    return apiError('Invalid email or password', 401)
  }

  // Create session token
  const token = await createSession(user, request as NextRequest)
  
  // Log successful login
  await logAuthEvent(user.id, 'login', request as NextRequest)

  // Create response with cookie
  const response = apiResponse({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
    message: 'Login successful',
  })

  // Set secure cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })

  return response
}, {
  validateBody: loginSchema,
  rateLimit: {
    limiter: rateLimiters.auth,
    endpoint: 'login'
  }
})