import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { createUser, ROLE_PERMISSIONS, logAuthEvent, PERMISSIONS } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'viewer']).optional().default('viewer'),
})

export const POST = createApiHandler(async ({ body, request, user }) => {
  const { email, password, role } = body

  // Get default permissions for role
  const permissions = ROLE_PERMISSIONS[role]

  // Create user
  const newUser = await createUser(email, password, role, permissions)
  
  if (!newUser) {
    return apiError('Failed to create user. Email may already be in use.', 400)
  }

  // Log user creation
  await logAuthEvent(user?.id || newUser.id, 'permissions_changed', request as NextRequest, {
    action: 'user_created',
    targetUserId: newUser.id,
    role,
  })

  return apiResponse({
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions,
    },
    message: 'User created successfully',
  }, { status: 201 })
}, {
  validateBody: registerSchema,
  requireAuth: true,
  requiredPermissions: [PERMISSIONS.USERS_WRITE], // Only users with user write permission can create users
})