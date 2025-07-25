# Security Headers Guide

This guide explains the security headers implemented in the inventory management system and their purpose.

## Overview

Security headers are HTTP response headers that provide an additional layer of security by instructing browsers how to behave when handling the site's content. They help protect against common web vulnerabilities like XSS, clickjacking, and data injection attacks.

## Implemented Headers

### Content Security Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

**Purpose**: Prevents XSS attacks by controlling which resources can be loaded.

**Directives**:
- `default-src 'self'`: Only allow resources from the same origin by default
- `script-src`: Allows inline scripts (required for Next.js) and Vercel live reload
- `style-src`: Allows inline styles (for styled components)
- `img-src`: Allows images from HTTPS sources and data URLs
- `connect-src`: Allows API calls and WebSocket connections
- `frame-ancestors 'none'`: Prevents the site from being embedded in frames
- `upgrade-insecure-requests`: Upgrades HTTP requests to HTTPS

### X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose**: Prevents clickjacking attacks by disallowing the page from being embedded in frames or iframes.

### X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose**: Prevents MIME type sniffing, forcing browsers to respect the declared Content-Type.

### X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose**: Enables the browser's built-in XSS filter and blocks the page if an attack is detected.

### Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose**: Controls how much referrer information is included with requests. This policy sends the origin for cross-origin requests but full URL for same-origin requests.

### Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

**Purpose**: Disables access to sensitive browser features that the application doesn't need.

### Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose**: Forces browsers to use HTTPS for all future requests to the domain (production only).

## Implementation

The security headers are implemented in the Next.js middleware (`middleware.ts`) and applied to all responses:

```typescript
function applySecurityHeaders(response: NextResponse): void {
  // Apply all security headers
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  // ... other headers
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  applySecurityHeaders(response)
  // ... rest of middleware logic
  return response
}
```

## Testing Security Headers

### Using Browser Developer Tools

1. Open Chrome/Firefox Developer Tools
2. Go to Network tab
3. Load any page
4. Click on the main document request
5. Check Response Headers section

### Using Online Tools

- [Security Headers](https://securityheaders.com/) - Scan your domain
- [Mozilla Observatory](https://observatory.mozilla.org/) - Comprehensive security scan

### Using cURL

```bash
curl -I https://your-domain.com
```

## Customization

### Relaxing CSP for Development

If you need to use external scripts or styles during development:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development'

const csp = [
  "default-src 'self'",
  `script-src 'self' ${isDevelopment ? "'unsafe-eval'" : ""} https://vercel.live`,
  // ... other directives
].join('; ')
```

### Adding Trusted Sources

To allow specific external resources:

```typescript
// Allow Google Fonts
"font-src 'self' data: https://fonts.gstatic.com",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

// Allow specific CDN
"script-src 'self' https://cdn.example.com",
"img-src 'self' data: https: blob: https://cdn.example.com",
```

### Reporting CSP Violations

To monitor CSP violations in production:

```typescript
const csp = [
  // ... other directives
  "report-uri /api/csp-report",
  "report-to csp-endpoint"
].join('; ')

// Also add Report-To header
response.headers.set('Report-To', JSON.stringify({
  group: "csp-endpoint",
  max_age: 86400,
  endpoints: [{ url: "/api/csp-report" }]
}))
```

## Common Issues

### Inline Scripts Blocked

**Problem**: Next.js or third-party scripts blocked by CSP.

**Solution**: Use nonces or hashes instead of 'unsafe-inline':

```typescript
// Generate nonce for each request
const nonce = crypto.randomBytes(16).toString('base64')
response.headers.set('Content-Security-Policy', 
  `script-src 'self' 'nonce-${nonce}'`
)
```

### External Resources Blocked

**Problem**: Images, fonts, or API calls blocked.

**Solution**: Add specific domains to appropriate directives:

```typescript
"img-src 'self' data: https://example.com",
"connect-src 'self' https://api.example.com",
```

### Development vs Production

**Problem**: Different requirements between environments.

**Solution**: Use environment-specific configurations:

```typescript
if (process.env.NODE_ENV === 'production') {
  // Stricter CSP for production
  response.headers.set('Content-Security-Policy', productionCSP)
} else {
  // Relaxed CSP for development
  response.headers.set('Content-Security-Policy', developmentCSP)
}
```

## Security Best Practices

1. **Start Strict**: Begin with restrictive policies and relax as needed
2. **Monitor Violations**: Implement CSP reporting to catch issues
3. **Regular Audits**: Use automated tools to verify headers
4. **Keep Updated**: Review and update policies as the application evolves
5. **Test Thoroughly**: Verify all functionality works with headers enabled

## Additional Resources

- [MDN Web Docs - HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Security Headers Quick Reference](https://web.dev/security-headers/)