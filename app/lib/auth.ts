import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { supabase } from './supabase'
import { AuthenticationError, AuthorizationError } from './errors'

// Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-in-production')
const COOKIE_NAME = 'auth-token'
const TOKEN_EXPIRY = '24h'
const SALT_ROUNDS = 10

// Type definitions
export interface User {
  id: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  permissions: string[]
  is_active: boolean
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  permissions: string[]
  exp: number
  iat: number
}

export interface AuthResult {
  user: User
}

// JWT utility functions
export class AuthTokens {
  static async createToken(user: User): Promise<string> {
    return await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(JWT_SECRET)
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      // Ensure the payload has all required fields
      if (!payload.userId || !payload.email || !payload.role || !payload.permissions) {
        return null
      }
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
        permissions: payload.permissions as string[],
        exp: payload.exp as number,
        iat: payload.iat as number
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      return null
    }
  }
}

// Password hashing utilities
export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}

// Authentication middleware for API routes
export async function authMiddleware(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<NextResponse | AuthResult> {
  try {
    // Extract token from cookies or Authorization header
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value || 
                 request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw new AuthenticationError('Authentication required')
    }

    // Verify the token
    const payload = await AuthTokens.verifyToken(token)
    if (!payload) {
      throw new AuthenticationError('Invalid or expired token')
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      throw new AuthenticationError('Token expired')
    }

    // Get user from database to ensure they still exist and are active
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      throw new AuthenticationError('User not found or inactive')
    }

    // Create user object
    const authUser: User = {
      id: user.id,
      email: user.email,
      role: user.role as User['role'],
      permissions: user.permissions || [],
      is_active: user.is_active,
    }

    // Check permissions if required
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission =>
        authUser.permissions.includes(permission) || authUser.role === 'admin'
      )

      if (!hasPermission) {
        throw new AuthorizationError(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
        )
      }
    }

    return { user: authUser }
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error
    }
    console.error('Authentication middleware error:', error)
    throw new AuthenticationError('Authentication failed')
  }
}

// Higher-order function for API route protection
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  requiredPermissions: string[] = []
) {
  return async (request: NextRequest, ...args: T) => {
    try {
      const authResult = await authMiddleware(request, requiredPermissions)
      
      // If it's a response, return it (error case)
      if (authResult instanceof NextResponse) {
        return authResult
      }
      
      // Store user in request for access in handler
      ;(request as any).user = authResult.user
      
      return handler(request, ...args)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// User authentication functions
export async function validateCredentials(email: string, password: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return null
    }

    const isValid = await PasswordUtils.verify(password, user.password_hash)
    if (!isValid) {
      return null
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      is_active: user.is_active,
    }
  } catch (error) {
    console.error('Credential validation error:', error)
    return null
  }
}

// Create user function
export async function createUser(
  email: string,
  password: string,
  role: User['role'] = 'viewer',
  permissions: string[] = []
): Promise<User | null> {
  try {
    const passwordHash = await PasswordUtils.hash(password)

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        permissions,
      })
      .select()
      .single()

    if (error || !user) {
      console.error('User creation error:', error)
      return null
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      is_active: user.is_active,
    }
  } catch (error) {
    console.error('User creation error:', error)
    return null
  }
}

// Audit logging function
export async function logAuthEvent(
  userId: string | null,
  eventType: 'login' | 'logout' | 'login_failed' | 'password_changed' | 'permissions_changed' | 'account_locked' | 'account_unlocked',
  request: NextRequest,
  metadata: Record<string, any> = {}
) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await supabase
      .from('auth_audit_logs')
      .insert({
        user_id: userId,
        event_type: eventType,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata,
      })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

// Session management
export async function createSession(user: User, request: NextRequest): Promise<string> {
  const token = await AuthTokens.createToken(user)
  
  // Store session in database
  const tokenHash = await bcrypt.hash(token, 5) // Light hashing for session tracking
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await supabase
    .from('auth_sessions')
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    })

  return token
}

export async function invalidateSession(token: string) {
  const tokenHash = await bcrypt.hash(token, 5)
  
  await supabase
    .from('auth_sessions')
    .update({ is_active: false })
    .eq('token_hash', tokenHash)
}

// Clean up expired sessions
export async function cleanupExpiredSessions() {
  await supabase
    .from('auth_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
}

// Permission definitions
export const PERMISSIONS = {
  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  INVENTORY_DELETE: 'inventory:delete',
  
  // Purchase Orders
  PO_READ: 'purchase_orders:read',
  PO_WRITE: 'purchase_orders:write',
  PO_DELETE: 'purchase_orders:delete',
  
  // Vendors
  VENDORS_READ: 'vendors:read',
  VENDORS_WRITE: 'vendors:write',
  VENDORS_DELETE: 'vendors:delete',
  
  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  
  // Sync
  SYNC_EXECUTE: 'sync:execute',
  SYNC_MONITOR: 'sync:monitor',
  
  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  
  // Admin
  ADMIN_ACCESS: 'admin:access',
} as const

// Role permission mappings
export const ROLE_PERMISSIONS: Record<User['role'], string[]> = {
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.PO_READ,
    PERMISSIONS.PO_WRITE,
    PERMISSIONS.VENDORS_READ,
    PERMISSIONS.VENDORS_WRITE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SYNC_EXECUTE,
    PERMISSIONS.SYNC_MONITOR,
  ],
  viewer: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PO_READ,
    PERMISSIONS.VENDORS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SYNC_MONITOR,
  ],
}