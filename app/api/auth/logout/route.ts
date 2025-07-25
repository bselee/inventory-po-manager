import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { invalidateSession, logAuthEvent } from '@/app/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createApiHandler(async ({ request, user }) => {
  // Get the token from cookie
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value

  if (token && user) {
    // Invalidate the session in database
    await invalidateSession(token)
    
    // Log logout event
    await logAuthEvent(user.id, 'logout', request as NextRequest)
  }

  // Create response
  const response = apiResponse({
    message: 'Logout successful',
  })

  // Clear the cookie
  response.cookies.delete('auth-token')

  return response
}, {
  requireAuth: true, // Logout requires being logged in
})