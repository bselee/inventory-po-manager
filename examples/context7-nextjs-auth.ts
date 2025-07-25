/**
 * CONTEXT7 EXAMPLE: Next.js API Middleware for Authentication
 * ==========================================================
 * 
 * Request: "Create Next.js API middleware for authentication. use context7"
 * 
 * Context7 would provide current Next.js 13+ best practices for API authentication:
 */

// Based on Context7 guidance for Next.js API middleware:

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

// 1. Environment variables and configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'auth-token';
const TOKEN_EXPIRY = '24h';

// 2. Type definitions for authentication
interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: string[];
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  exp: number;
  iat: number;
}

// 3. JWT utility functions
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
      .sign(JWT_SECRET);
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as JWTPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}

// 4. Authentication middleware for API routes
export async function authMiddleware(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<NextResponse | { user: User }> {
  try {
    // Extract token from cookies or Authorization header
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || 
                 request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'NO_TOKEN' },
        { status: 401 }
      );
    }

    // Verify the token
    const payload = await AuthTokens.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      return NextResponse.json(
        { error: 'Token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    // Create user object
    const user: User = {
      id: payload.userId,
      email: payload.email,
      role: payload.role as User['role'],
      permissions: payload.permissions,
    };

    // Check permissions if required
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(permission =>
        user.permissions.includes(permission) || user.role === 'admin'
      );

      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions', 
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredPermissions,
            current: user.permissions 
          },
          { status: 403 }
        );
      }
    }

    return { user };
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', code: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}

// 5. Higher-order function for API route protection
export function withAuth(
  handler: (request: NextRequest, context: { params: any }, user: User) => Promise<NextResponse>,
  requiredPermissions: string[] = []
) {
  return async (request: NextRequest, context: { params: any }) => {
    const authResult = await authMiddleware(request, requiredPermissions);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    
    return handler(request, context, authResult.user);
  };
}

// 6. Role-based access control decorator
export function requireRole(roles: User['role'][]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(request: NextRequest, context: any) {
      const authResult = await authMiddleware(request);
      
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      
      if (!roles.includes(authResult.user.role)) {
        return NextResponse.json(
          { error: 'Role not authorized', code: 'ROLE_UNAUTHORIZED' },
          { status: 403 }
        );
      }
      
      return originalMethod.call(this, request, context, authResult.user);
    };
  };
}

// 7. Example usage in API routes

// app/api/inventory/route.ts
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['inventory:read']);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const { user } = authResult;
  
  // Your inventory logic here
  return NextResponse.json({
    message: `Hello ${user.email}`,
    inventory: [],
    userRole: user.role,
  });
}

// app/api/inventory/[id]/route.ts
export const PUT = withAuth(
  async (request: NextRequest, { params }, user: User) => {
    const { id } = params;
    const data = await request.json();
    
    // Update inventory item
    return NextResponse.json({
      message: `Updated inventory item ${id}`,
      updatedBy: user.email,
    });
  },
  ['inventory:write'] // Required permissions
);

// app/api/admin/users/route.ts
export class AdminUsersHandler {
  @requireRole(['admin'])
  static async GET(request: NextRequest, context: any, user: User) {
    // Only admins can access this
    return NextResponse.json({ users: [], requestedBy: user.email });
  }
}

export const GET = AdminUsersHandler.GET;

// 8. Login endpoint for obtaining tokens
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validate credentials (implement your own logic)
    const user = await validateCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    
    // Create JWT token
    const token = await AuthTokens.createToken(user);
    
    // Set secure cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
    
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed', code: 'LOGIN_ERROR' },
      { status: 500 }
    );
  }
}

// 9. Logout endpoint
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete(COOKIE_NAME);
  
  return response;
}

// 10. Middleware for protecting pages (middleware.ts)
export function middleware(request: NextRequest) {
  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    return authMiddleware(request);
  }
  
  // Protect admin pages
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return authMiddleware(request, ['admin:access']);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/protected/:path*', '/admin/:path*'],
};

// Helper function (implement based on your auth provider)
async function validateCredentials(email: string, password: string): Promise<User | null> {
  // Implement your authentication logic here
  // This could integrate with Supabase Auth, Auth0, Firebase Auth, etc.
  return null;
}

/**
 * CONTEXT7 BEST PRACTICES SUMMARY:
 * ================================
 * 
 * Context7 would recommend these modern Next.js authentication patterns:
 * 
 * 1. JWT with HttpOnly Cookies: Secure token storage
 * 2. Middleware Protection: Route-level security
 * 3. Type Safety: Full TypeScript support
 * 4. Permission-Based Access: Granular authorization
 * 5. Error Handling: Consistent error responses
 * 6. Security Headers: Proper cookie configuration
 * 7. Modular Design: Reusable auth utilities
 * 8. Role-Based Access: Decorator pattern for roles
 * 9. Token Refresh: Automatic token renewal
 * 10. Audit Logging: Track authentication events
 * 
 * Security Best Practices:
 * - Use HttpOnly cookies for token storage
 * - Implement CSRF protection
 * - Validate all inputs
 * - Use secure cookie settings in production
 * - Implement rate limiting for auth endpoints
 * - Log security events for monitoring
 * - Use environment variables for secrets
 * - Implement proper session management
 */
