import { createApiHandler, apiResponse } from '@/app/lib/api-handler'
import { PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = createApiHandler(async ({ user }) => {
  if (!user) {
    return apiResponse(null, { status: 401, message: 'Not authenticated' })
  }

  return apiResponse({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
    },
  })
}, {
  requireAuth: true, // Requires authentication but no specific permissions
})