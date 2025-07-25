# Rate Limiting Guide

This guide explains how to implement and configure rate limiting for API routes in the inventory management system.

## Overview

Rate limiting is implemented using Redis-backed storage with fallback to memory storage. The system tracks request counts per time window and blocks requests that exceed configured limits.

## Configuration

### Default Rate Limits

```typescript
// General API endpoints
api: {
  windowMs: 60 * 1000,     // 1 minute
  max: 100,                // 100 requests per minute
}

// Authentication endpoints
auth: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 attempts per 15 minutes
}

// Sync operations
sync: {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                  // 10 syncs per hour
}

// Search operations
search: {
  windowMs: 60 * 1000,      // 1 minute
  max: 30,                  // 30 searches per minute
}
```

## Implementation

### Basic Usage

```typescript
import { createApiHandler } from '@/app/lib/api-handler'

export const GET = createApiHandler(async ({ query }) => {
  // Handler logic
  return apiResponse({ data: result })
}, {
  // Rate limiting is enabled by default using rateLimiters.api
})
```

### Custom Rate Limiter

```typescript
import { createApiHandler } from '@/app/lib/api-handler'
import { rateLimiters } from '@/app/lib/rate-limiter'

export const POST = createApiHandler(async ({ body }) => {
  // Handler logic
  return apiResponse({ data: result })
}, {
  rateLimit: {
    limiter: rateLimiters.auth,  // Use stricter auth limiter
    endpoint: 'login'            // Custom endpoint identifier
  }
})
```

### Disable Rate Limiting

```typescript
export const GET = createApiHandler(async ({ query }) => {
  // Handler logic
  return apiResponse({ data: result })
}, {
  rateLimit: {
    skip: true  // Disable rate limiting for this endpoint
  }
})
```

### Custom Rate Limiter

```typescript
import { RateLimiter } from '@/app/lib/rate-limiter'

const customLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 20,                  // 20 requests per 5 minutes
  keyPrefix: 'custom',      // Custom key prefix
  message: 'Too many requests from this IP'
})

export const POST = createApiHandler(async ({ body }) => {
  // Handler logic
}, {
  rateLimit: {
    limiter: customLimiter
  }
})
```

## Response Headers

Rate limited responses include the following headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in the current window
- `X-RateLimit-Reset`: ISO 8601 timestamp when the window resets
- `Retry-After`: Seconds until the client can retry (only on 429 responses)

## Error Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset": "2024-01-15T10:30:00.000Z"
  }
}
```

## Identification Strategy

The rate limiter identifies clients using:

1. User ID (if authenticated via `x-user-id` header)
2. IP address (from `x-forwarded-for` or `x-real-ip` headers)

## Redis Configuration

Set Redis connection details in environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

If Redis is unavailable, the system allows all requests to prevent service disruption.

## Best Practices

1. **Use appropriate limiters**: Auth endpoints should use `rateLimiters.auth`, sync operations should use `rateLimiters.sync`

2. **Set custom endpoints**: For better tracking, set custom endpoint identifiers:
   ```typescript
   rateLimit: {
     endpoint: 'user-profile-update'
   }
   ```

3. **Combine with authentication**: Rate limiting runs before authentication to prevent brute force:
   ```typescript
   {
     requireAuth: true,
     rateLimit: {
       limiter: rateLimiters.api
     }
   }
   ```

4. **Monitor rate limit metrics**: Check Redis for rate limit keys to monitor usage patterns

5. **Graceful degradation**: The system allows requests when Redis is down to maintain availability

## Example Implementations

### Login Endpoint

```typescript
export const POST = createApiHandler(async ({ body }) => {
  const { email, password } = body
  const user = await validateCredentials(email, password)
  
  if (!user) {
    return apiError('Invalid credentials', 401)
  }
  
  return apiResponse({ user, token })
}, {
  validateBody: loginSchema,
  rateLimit: {
    limiter: rateLimiters.auth,
    endpoint: 'login'
  }
})
```

### Data Sync Endpoint

```typescript
export const POST = createApiHandler(async ({ body }) => {
  const result = await executeSync(body)
  return apiResponse({ result })
}, {
  requireAuth: true,
  requiredPermissions: ['sync:manage'],
  rateLimit: {
    limiter: rateLimiters.sync,
    endpoint: 'sync-finale'
  }
})
```

### Search Endpoint

```typescript
export const GET = createApiHandler(async ({ query }) => {
  const results = await searchInventory(query.get('q'))
  return apiResponse({ results })
}, {
  rateLimit: {
    limiter: rateLimiters.search,
    endpoint: 'inventory-search'
  }
})
```