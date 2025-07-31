/**
 * Base API handler with standardized error handling and response patterns
 * All API routes should use these handlers for consistency
 */

import { NextResponse, NextRequest } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { handleApiError, AppError, logError, AuthenticationError, AuthorizationError } from './errors'
import { authMiddleware, User } from './auth'
import { RateLimiter, rateLimiters } from './rate-limiter'
import { checkCSRF, csrfError, CSRFOptions } from './csrf'

export interface ApiHandlerOptions {
  requireAuth?: boolean
  requiredPermissions?: string[]
  validateBody?: ZodSchema
  validateQuery?: ZodSchema
  rateLimit?: {
    limiter?: RateLimiter // Custom limiter or use default
    endpoint?: string // Specific endpoint identifier for rate limiting
    skip?: boolean // Skip rate limiting for this handler
  }
  csrf?: CSRFOptions | boolean // CSRF protection options or boolean to enable/disable
}

export interface ApiContext {
  request: Request
  params?: Record<string, string>
  body?: any
  query?: URLSearchParams
  user?: User
  rateLimitHeaders?: Headers
  csrfToken?: string
}

/**
 * Standard API response format
 */
export function apiResponse<T>(
  data: T,
  options?: {
    status?: number
    message?: string
    headers?: HeadersInit
    context?: ApiContext // Pass context to include rate limit headers
  }
) {
  const status = options?.status || 200
  const response: any = { data }
  
  if (options?.message) {
    response.message = options.message
  }

  // Merge rate limit headers if available in context
  let finalHeaders = options?.headers
  if (options?.context?.rateLimitHeaders) {
    const headers = new Headers(finalHeaders)
    options.context.rateLimitHeaders.forEach((value, key) => {
      headers.set(key, value)
    })
    finalHeaders = headers
  }

  return NextResponse.json(response, {
    status,
    headers: finalHeaders
  })
}

/**
 * Standard error response format using unified error handling
 */
export function apiError(
  error: unknown,
  statusOverride?: number,
  detailsOverride?: any
) {
  const errorInfo = handleApiError(error)
  
  // Log the error with context
  logError(error, {
    operation: 'API_REQUEST',
    metadata: detailsOverride
  })
  
  return NextResponse.json(
    {
      error: errorInfo.error,
      code: errorInfo.code,
      ...(errorInfo.details && { details: errorInfo.details }),
      ...(detailsOverride && { details: detailsOverride })
    },
    { status: statusOverride || errorInfo.statusCode }
  )
}

/**
 * Create a standardized API handler with error handling
 */
export function createApiHandler<T = any>(
  handler: (context: ApiContext) => Promise<NextResponse<T>>,
  options?: ApiHandlerOptions
) {
  return async (request: Request, { params }: { params?: Record<string, string> } = {}) => {
    try {
      const context: ApiContext = {
        request,
        params
      }

      // Parse query parameters
      const url = new URL(request.url)
      context.query = url.searchParams

      // Check rate limiting (before auth to prevent brute force attacks)
      if (!options?.rateLimit?.skip) {
        const limiter = options?.rateLimit?.limiter || rateLimiters.api
        const endpoint = options?.rateLimit?.endpoint || url.pathname
        
        const rateLimitResult = await limiter.check(request as NextRequest, endpoint)
        
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              details: {
                limit: rateLimitResult.limit,
                remaining: rateLimitResult.remaining,
                reset: rateLimitResult.reset.toISOString()
              }
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
                'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString()
              }
            }
          )
        }
        
        // Add rate limit headers to context for later use
        const headers = new Headers()
        headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString())
        
        context.rateLimitHeaders = headers
      }

      // Parse and validate body for non-GET requests
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          context.body = await request.json()
        } catch {
          // Body might be empty or not JSON
          context.body = null
        }

        // Validate body if schema provided
        if (options?.validateBody && context.body) {
          try {
            context.body = options.validateBody.parse(context.body)
          } catch (error) {
            if (error instanceof ZodError) {
              return apiError('Validation failed', 400, error.errors)
            }
            throw error
          }
        }
      }

      // Validate query parameters if schema provided
      if (options?.validateQuery) {
        const queryObject: Record<string, any> = {}
        context.query.forEach((value, key) => {
          queryObject[key] = value
        })
        
        try {
          const validated = options.validateQuery.parse(queryObject)
          // Replace query with validated version
          context.query = new URLSearchParams(validated)
        } catch (error) {
          if (error instanceof ZodError) {
            return apiError('Invalid query parameters', 400, error.errors)
          }
          throw error
        }
      }

      // Add authentication check if required
      if (options?.requireAuth) {
        try {
          const authResult = await authMiddleware(
            request as NextRequest,
            options.requiredPermissions || []
          )
          
          if ('user' in authResult) {
            context.user = authResult.user
          } else {
            // authResult is a NextResponse (error)
            return authResult
          }
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return apiError(error, 401)
          }
          if (error instanceof AuthorizationError) {
            return apiError(error, 403)
          }
          throw error
        }
      }

      // Check CSRF protection
      if (options?.csrf !== false) {
        const csrfOptions = typeof options?.csrf === 'object' ? options.csrf : {}
        const csrfResult = await checkCSRF(request as NextRequest, csrfOptions)
        
        if (!csrfResult.valid) {
          return csrfError(csrfResult.error)
        }
        
        // Store new token if generated (for rotation)
        if (csrfResult.newToken) {
          context.csrfToken = csrfResult.newToken
        }
      }

      // Call the actual handler
      const response = await handler(context)
      
      // Add rate limit headers to response if available
      if (context.rateLimitHeaders && response.headers) {
        const newHeaders = new Headers(response.headers)
        context.rateLimitHeaders.forEach((value, key) => {
          newHeaders.set(key, value)
        })
        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        })
      }
      
      return response
    } catch (error) {
      // Use unified error handling
      return apiError(error)
    }
  }
}

/**
 * Pagination helper
 */
export function getPaginationParams(query: URLSearchParams) {
  const page = parseInt(query.get('page') || '1')
  const limit = parseInt(query.get('limit') || '100')
  const sortBy = query.get('sortBy') || undefined
  const sortDirection = (query.get('sortDirection') || 'asc') as 'asc' | 'desc'

  return {
    page: Math.max(1, page),
    limit: Math.min(1000, Math.max(1, limit)),
    sortBy,
    sortDirection
  }
}

/**
 * Create standard CRUD handlers for a resource
 */
export function createCrudHandlers<T>(
  resourceName: string,
  dataAccess: {
    list: (filters: any, pagination: any) => Promise<{ items: T[]; total: number }>
    get: (id: string) => Promise<T | null>
    create: (data: any) => Promise<T>
    update: (id: string, data: any) => Promise<T>
    delete?: (id: string) => Promise<void>
  },
  validation?: {
    create?: ZodSchema
    update?: ZodSchema
    query?: ZodSchema
  }
) {
  return {
    // GET handler - list resources
    GET: createApiHandler(async ({ query }) => {
      const searchParams = query || new URLSearchParams()
      const pagination = getPaginationParams(searchParams)
      const filters: Record<string, any> = {}
      
      // Extract non-pagination query params as filters
      searchParams.forEach((value, key) => {
        if (!['page', 'limit', 'sortBy', 'sortDirection'].includes(key)) {
          filters[key] = value
        }
      })

      const result = await dataAccess.list(filters, pagination)
      
      return apiResponse({
        [resourceName]: result.items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit)
        }
      })
    }, { validateQuery: validation?.query }),

    // POST handler - create resource
    POST: createApiHandler(async ({ body }) => {
      const item = await dataAccess.create(body)
      
      return apiResponse(
        { [resourceName.slice(0, -1)]: item },
        { 
          status: 201,
          message: `${resourceName.slice(0, -1)} created successfully`
        }
      )
    }, { validateBody: validation?.create }),

    // GET handler - get single resource
    GET_BY_ID: createApiHandler(async ({ params }) => {
      const id = params?.id
      if (!id) {
        throw new Error('ID is required')
      }

      const item = await dataAccess.get(id)
      if (!item) {
        throw new Error(`${resourceName.slice(0, -1)} not found`)
      }

      return apiResponse({ [resourceName.slice(0, -1)]: item })
    }),

    // PUT handler - update resource
    PUT: createApiHandler(async ({ params, body }) => {
      const id = params?.id
      if (!id) {
        throw new Error('ID is required')
      }

      const item = await dataAccess.update(id, body)
      
      return apiResponse(
        { [resourceName.slice(0, -1)]: item },
        { message: `${resourceName.slice(0, -1)} updated successfully` }
      )
    }, { validateBody: validation?.update }),

    // DELETE handler - delete resource
    DELETE: dataAccess.delete ? createApiHandler(async ({ params }) => {
      const id = params?.id
      if (!id) {
        throw new Error('ID is required')
      }

      await dataAccess.delete!(id)
      
      return apiResponse(
        null,
        { 
          status: 204,
          message: `${resourceName.slice(0, -1)} deleted successfully`
        }
      )
    }) : undefined
  }
}