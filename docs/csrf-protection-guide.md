# CSRF Protection Guide

This guide explains the CSRF (Cross-Site Request Forgery) protection implementation in the inventory management system.

## Overview

The application uses a double-submit cookie pattern with encrypted tokens for CSRF protection. This prevents malicious websites from making unauthorized requests on behalf of authenticated users.

## How It Works

1. **Token Generation**: Server generates a cryptographically secure token with HMAC signature
2. **Cookie Storage**: Token is stored in a non-httpOnly cookie (readable by JavaScript)
3. **Header Submission**: Client includes token in `X-CSRF-Token` header for state-changing requests
4. **Double Submit Verification**: Server verifies cookie token matches header token
5. **Token Validation**: Server validates token signature and expiry

## Implementation

### Server-Side (API Routes)

CSRF protection is enabled by default for all state-changing methods (POST, PUT, DELETE, PATCH).

```typescript
// CSRF protection enabled by default
export const POST = createApiHandler(async ({ body }) => {
  // Handler logic
  return apiResponse({ data: result })
})

// Disable CSRF for specific endpoint
export const POST = createApiHandler(async ({ body }) => {
  // Handler logic
}, {
  csrf: false
})

// Custom CSRF options
export const POST = createApiHandler(async ({ body }) => {
  // Handler logic
}, {
  csrf: {
    generateNewToken: true,  // Rotate token after request
    methods: ['POST', 'PUT'] // Custom protected methods
  }
})
```

### Client-Side

#### Using the CSRF Hook

```typescript
import { useCSRF } from '@/app/hooks/useCSRF'

function MyComponent() {
  const { token, loading, error, secureFetch } = useCSRF()
  
  const handleSubmit = async (data) => {
    try {
      const response = await secureFetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        // Handle success
      }
    } catch (error) {
      // Handle error
    }
  }
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

#### Using the Client Fetch Utility

```typescript
import { api } from '@/app/lib/client-fetch'

// CSRF token automatically included
const { data, error } = await api.post('/api/inventory', {
  sku: 'ABC123',
  quantity: 100
})

// Or use the lower-level clientFetch
import { clientFetch } from '@/app/lib/client-fetch'

const response = await clientFetch('/api/inventory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sku: 'ABC123', quantity: 100 })
})
```

## Token Management

### Token Generation

Tokens include:
- 32 bytes of random data
- Timestamp for expiry checking
- HMAC-SHA256 signature

### Token Expiry

- Default expiry: 24 hours
- Tokens are validated for expiry on each request
- Expired tokens result in 403 Forbidden response

### Token Rotation

For sensitive operations, enable token rotation:

```typescript
export const POST = createApiHandler(async ({ body, csrfToken }) => {
  // Perform sensitive operation
  
  // New token available in context if rotation enabled
  if (csrfToken) {
    // Token will be set in response cookie
  }
  
  return apiResponse({ success: true })
}, {
  csrf: {
    generateNewToken: true
  }
})
```

## Security Considerations

1. **Cookie Settings**:
   - `httpOnly: false` - Must be readable by JavaScript
   - `secure: true` - HTTPS only in production
   - `sameSite: strict` - Prevents cross-site requests

2. **Token Storage**:
   - Never store tokens in localStorage
   - Use secure cookies only
   - Tokens are tied to user session

3. **Error Handling**:
   - Invalid tokens return 403 Forbidden
   - Client automatically retries with new token
   - Rate limiting prevents brute force attacks

## API Endpoints

### Get CSRF Token

```http
GET /api/auth/csrf
```

Sets CSRF cookie and returns success message.

### Error Responses

```json
// Missing token
{
  "error": "CSRF token missing",
  "code": "CSRF_VALIDATION_FAILED"
}

// Token mismatch
{
  "error": "CSRF token mismatch",
  "code": "CSRF_VALIDATION_FAILED"
}

// Invalid/expired token
{
  "error": "Invalid or expired CSRF token",
  "code": "CSRF_VALIDATION_FAILED"
}
```

## Environment Variables

```env
# CSRF secret (defaults to JWT_SECRET if not set)
CSRF_SECRET=your_csrf_secret_min_32_chars
```

## Testing

When testing APIs with CSRF protection:

1. First make a GET request to `/api/auth/csrf` to get a token
2. Extract token from cookie
3. Include token in `X-CSRF-Token` header for subsequent requests

```bash
# Get CSRF token
curl -c cookies.txt http://localhost:3000/api/auth/csrf

# Extract token and make POST request
TOKEN=$(grep csrf-token cookies.txt | awk '{print $7}')
curl -b cookies.txt \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"sku":"ABC123"}' \
  http://localhost:3000/api/inventory
```

## Troubleshooting

### Common Issues

1. **403 Forbidden on POST requests**
   - Ensure CSRF token is included in header
   - Check token hasn't expired (24 hour lifetime)
   - Verify cookie and header tokens match

2. **Token not found in cookie**
   - Make GET request to `/api/auth/csrf` first
   - Check cookies are enabled in browser
   - Verify `credentials: 'include'` in fetch options

3. **CORS issues**
   - Ensure API and client are on same domain
   - Configure CORS headers if using different ports

### Debug Mode

Enable debug logging:

```typescript
// In your API route
console.log('CSRF Debug:', {
  hasCookie: !!request.cookies.get('csrf-token'),
  hasHeader: !!request.headers.get('x-csrf-token'),
  method: request.method
})
```