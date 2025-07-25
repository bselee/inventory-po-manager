import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken, setCSRFCookie } from '@/app/lib/csrf'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/auth/csrf - Get CSRF token
export const GET = createApiHandler(async ({ request }) => {
  // Generate new CSRF token
  const token = generateCSRFToken()
  
  // Create response
  const response = apiResponse({
    message: 'CSRF token generated'
  })
  
  // Set CSRF cookie
  setCSRFCookie(response, token)
  
  return response
}, {
  csrf: { skip: true }, // Skip CSRF check for token generation
  rateLimit: {
    endpoint: 'csrf-token'
  }
})