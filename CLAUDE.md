# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Core development
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Check TypeScript types
npm run setup      # Run initial setup script

# Testing - Jest
npm run test              # Run all Jest tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report (70% threshold)
npm run test:api          # Run API-specific tests
npm run test:unit         # Run unit tests
npm run test:integration  # Run integration tests
npm run test:db           # Run database tests
npm run test:health       # Run health check script

# Run a single Jest test file
npm run test -- path/to/test.spec.ts

# Testing - Playwright
npm run test:e2e          # Run all Playwright tests
npm run test:e2e:ui       # Run with Playwright UI mode
npm run test:e2e:headed   # Run in headed browser mode
npm run test:e2e:debug    # Run in debug mode
npm run test:crawl        # Run application crawler test
npm run test:health-e2e   # Run E2E health check
npm run test:inventory    # Test inventory page
npm run test:inventory:comprehensive  # Comprehensive inventory tests with HTML report
npm run test:settings     # Test settings page
npm run test:comprehensive # Run comprehensive test suite
npm run test:all          # Run Jest + Playwright tests

# Run a single Playwright test file
npx playwright test tests/e2e/specific-test.spec.ts
# Run tests matching a pattern
npx playwright test -g "should sync inventory"

# Database
npm run db:migrate   # Run database migrations
npm run db:validate  # Validate database schema
npm run db:backup    # Backup database

# Deployment
npm run deploy       # Deploy to Vercel (runs scripts/deploy-vercel.sh)
npm run deploy:check # Check Vercel deployment status
```

## Architecture Overview

Enterprise-grade inventory management system built with Next.js 14 App Router. Features intelligent purchase order automation, real-time analytics, and seamless Finale Inventory integration.

### Core Features
- **Intelligent Inventory Management**: Real-time tracking with predictive analytics
- **Smart Purchase Orders**: Automated generation based on sales velocity and reorder points
- **Multi-View Dashboards**: Table view, Planning view (30/60/90 day), Analytics view
- **Advanced Business Logic**: Sales velocity analysis, stock status classification, demand trend tracking

### Enhanced Inventory Features
The inventory page (`/app/inventory/page.tsx`) includes sophisticated calculations:
- **Sales Velocity**: Daily unit movement (30-day average)
- **Days Until Stockout**: Predictive calculation based on velocity
- **Stock Status Levels**: Critical (≤7 days), Low (≤30 days), Adequate, Overstocked
- **Demand Trends**: Increasing/Stable/Decreasing based on 30 vs 90-day comparison
- **Reorder Recommendations**: Automatic flagging of items needing immediate attention
- **Advanced Filtering**: By status, vendor, location, price range, sales velocity, stock days
- **Smart Sorting**: Multi-column sorting with direction indicators

### Key Architectural Decisions

1. **API Routes**: All backend logic is in `/app/api/*` using Next.js route handlers. Each route returns JSON responses with consistent error handling patterns.

2. **Database Access**: Direct Supabase client usage via `/app/lib/supabase.ts`. No ORM or query builder is used.

3. **External Services**: Integration logic is centralized in `/app/lib/finale-api.ts` for Finale, Google Sheets, and SendGrid.

4. **Type Safety**: TypeScript strict mode is enabled. Types are defined in `/app/types/*` files.

5. **State Management**: Client-side state uses React hooks. No global state management library.

## Important Implementation Notes

### API Routes Pattern
All API routes must include these exports for Vercel deployment:
```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET/POST/PUT/DELETE(request: Request) {
  try {
    // Validate input
    // Perform database/external service operations
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error message' },
      { status: 500 }
    )
  }
}
```

### Enhanced API Pattern
The project uses a centralized API handler utility for consistent error handling and validation:
```typescript
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'
import { z } from 'zod'

// Define validation schema
const schema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive()
})

export const POST = createApiHandler(async ({ body, params, query }) => {
  // Automatic error handling and validation
  const validated = schema.parse(body)
  
  // Business logic here
  const result = await someOperation(validated)
  
  // Success response
  return apiResponse(result, { message: 'Success' })
}, {
  validateBody: schema // Optional Zod validation
})
```

### Database Operations
Always use the Supabase client directly:
```typescript
import { supabase } from '@/app/lib/supabase'

const { data, error } = await supabase
  .from('table_name')
  .select('*')
```

### Environment Variables
Required environment variables (set in Vercel):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for server operations
- `FINALE_API_KEY` - Finale API key (also configurable via settings)
- `FINALE_API_SECRET` - Finale API secret (also configurable via settings)
- `FINALE_ACCOUNT_PATH` - Finale account URL path
- `SENDGRID_API_KEY` - SendGrid API key for email alerts (optional)

Note: Finale and SendGrid credentials can be configured either via environment variables or through the application settings interface

### Finale API Integration

The Finale API service (`/app/lib/finale-api.ts`) handles all Finale operations:
- **Authentication**: Uses Basic Auth with API key/secret
- **Base URL Pattern**: `https://app.finaleinventory.com/{account}/api/`
- **Key Endpoints**:
  - `/products` - Inventory data with pagination (100 items max per request)
  - `/vendors` (plural) - Vendor management with multiple fallback endpoints
  - `/purchaseOrder` - Purchase order operations
- **Response Format**: Handles parallel array format (columns + data arrays)
- **Date Filtering**: Inventory sync supports filtering by year (default: current year)
- **Error Handling**: Comprehensive error messages and retry logic
- **Vendor Endpoint Discovery**: Automatically tries multiple patterns (vendor, vendors, party, supplier)

### Sync Implementation

The application supports multiple sync strategies (`/app/api/sync-finale/route.ts`):
1. **Smart Sync** (default): Time-based intelligent sync
   - Last 6 hours: Inventory only
   - 6-24 hours: Critical items only  
   - 24+ hours: Full sync
2. **Full Sync**: All products and purchase orders
3. **Inventory Only**: Just inventory levels
4. **Critical Items**: Items below reorder point
5. **Active Products**: Non-discontinued items only

Key sync features:
- **Batch Processing**: 50-100 items per batch
- **Rate Limiting**: Exponential backoff (3 retries, 1-10s delays)
- **Stuck Detection**: Syncs > 30 minutes marked as failed
- **Concurrent Prevention**: Returns 409 if sync already running
- **Year Filtering**: Full syncs filter by current year to reduce data

### Cron Jobs

Configured in `vercel.json` (requires Vercel Pro plan or higher):
- `/api/cron/sync-finale`: Daily at 2 AM
- `/api/cron/sync-inventory`: Every 6 hours
- `/api/cron/sync-vendors`: Daily at 4 AM

### Email Alerts

SendGrid integration sends alerts for:
- Sync failures and errors
- Low inventory warnings
- Stuck sync processes (> 30 minutes)
- Critical inventory items below reorder point

Configure via settings page with SendGrid API key and alert email.

### Current State
- API routes are fully implemented with comprehensive error handling
- Robust sync system with multiple strategies and retry logic
- Basic authentication system implemented with JWT tokens and CSRF protection
- Playwright E2E tests implemented with creative testing patterns
- Production-ready with extensive monitoring and alerting
- Redis caching infrastructure available for performance optimization

### Settings Page Features
The settings page (`/app/settings/page.tsx`) provides comprehensive configuration:
- **Real-time Sync Status Monitor**: Live view of running syncs with auto-refresh
- **Manual Sync Trigger**: Direct control over sync operations
- **Stuck Sync Detection**: Automatic cleanup of syncs running >30 minutes
- **Finale Debug Panel**: Test connections and troubleshoot API issues
- **Sync Control Panel**: Master controls for all sync operations
- **Vendor Sync Manager**: Dedicated vendor data synchronization
- **Sales Data Uploader**: Import sales data from Finale Excel reports

### Critical Deployment Notes
- Settings are stored in the `settings` table with id=1
- Use `upsert` operations for settings to handle both insert and update cases
- The `getFinaleConfig` helper uses `maybeSingle()` to handle missing records gracefully
- Vendor endpoints use plural form (`/vendors` not `/vendor`)

## Testing

### Jest Testing
Jest is configured with TypeScript support. Tests should be placed in:
- `tests/` directory for integration tests
- `app/**/__tests__/` for component/route tests
- `lib/**/__tests__/` for utility tests

Test files should use `.test.ts` or `.spec.ts` extensions.

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage (threshold: 70%)
```

Module aliases are configured:
- `@/` maps to root directory
- `@/app/` maps to app directory
- `@/lib/` maps to lib directory

### Playwright E2E Testing
Playwright is configured for end-to-end testing with creative patterns for business logic validation:
- **Test Directory**: `tests/e2e/`
- **Base URL**: `http://localhost:3001`
- **Browsers**: Chrome, Firefox, Safari, Edge, Mobile Chrome/Safari
- **Features**: Screenshots on failure, video retention, trace collection

Key test suites:
- **Application Crawler**: Automated discovery and validation of all pages
- **Health Check**: API and system health validation
- **Inventory Page**: Business logic validation (sales velocity, reorder recommendations)
- **Settings Page**: Configuration and sync testing
- **Comprehensive Tests**: Full application workflow testing

Creative testing patterns available (see `/docs/playwright-creative-guide.md`):
- Business intelligence validation
- Performance benchmarking
- Visual regression testing
- Accessibility auditing
- Component state exploration

## MCP Server Integration

This workspace includes powerful MCP (Model Context Protocol) servers configured in `.vscode/settings.json`:

### Serena MCP Server
- **Purpose**: Advanced semantic code analysis and intelligent editing
- **Capabilities**: Semantic code understanding, intelligent refactoring, codebase navigation
- **Location**: Included in `/serena/` directory

### Context7 MCP Server
- **Purpose**: Up-to-date documentation and code examples for libraries
- **Capabilities**: Current docs for popular libraries, code examples, integration patterns
- **Location**: Included in `/context7/` directory

## Database Migrations

The project includes a migration system in `/scripts/migrations/`. When modifying the database schema:
1. Create new migration files following the numbered pattern
2. Test migrations locally before deploying
3. Key migration features include sales tracking fields (30/90 day), sync status tracking, and authentication fields

## Database Schema

Key tables and their purposes:
- `inventory_items`: SKU, stock levels, costs, sales data, Finale sync status
- `purchase_orders`: PO management with vendor relations and Finale sync tracking
- `vendors`: Vendor management with contact info and Finale integration
- `settings`: Application configuration (single row with id=1)
- `sync_logs`: Tracks sync history with external services

## Deployment

The application auto-deploys to Vercel on push to the main branch. The `vercel.json` configuration includes:
- 60-second timeout for API routes
- Security headers
- Redirect from root to `/inventory`
- Health check endpoint rewrite
- Cron jobs for automated syncing

### Deployment Scripts
- `npm run deploy`: Runs comprehensive deployment script with validation
- `npm run deploy:check`: Verifies deployment status and health
- Scripts include git status checking, remote sync verification, and health check validation

## Code Patterns and Best Practices

### API Response Pattern
Always use consistent response formatting:
```typescript
// Success response
return NextResponse.json({ 
  data: result,
  message: 'Operation successful' 
})

// Error response
return NextResponse.json(
  { error: error instanceof Error ? error.message : 'Unknown error' },
  { status: 500 }
)
```

### Error Handling Pattern
Wrap all async operations in try-catch blocks:
```typescript
try {
  const result = await someAsyncOperation()
  return NextResponse.json({ data: result })
} catch (error) {
  console.error('Operation failed:', error)
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  )
}
```

### Component Structure
Follow this consistent structure for React components:
```typescript
// 1. Imports
import { useState, useEffect } from 'react'

// 2. Types/Interfaces
interface ComponentProps {
  prop1: string
  prop2?: number
}

// 3. Component
export default function ComponentName({ prop1, prop2 = 0 }: ComponentProps) {
  // 4. State and hooks
  const [state, setState] = useState<string>('')
  
  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, [])
  
  // 6. Handlers
  const handleClick = () => {
    // Handler logic
  }
  
  // 7. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## Common Issues and Troubleshooting

### Sync Issues
1. **Stuck Sync (>30 minutes)**: The system automatically marks these as failed. Check `/app/api/sync-status-monitor/route.ts` for the cleanup logic.
2. **Rate Limiting**: The system implements exponential backoff. If syncs fail repeatedly, check Finale API rate limits.
3. **Concurrent Sync Prevention**: The system returns 409 if a sync is already running. Wait for completion or mark as failed.

### Database Connection Issues
1. **Connection Pool Exhaustion**: Ensure all Supabase queries properly handle errors
2. **Migration Failures**: Run migrations in order from `/scripts/migrations/`
3. **Settings Table**: Always use `upsert` for settings (id=1) to handle missing records

### Finale API Issues
1. **Authentication Failures**: Check API key/secret in settings or environment variables
2. **Endpoint Discovery**: The system tries multiple vendor endpoint patterns automatically
3. **Response Format**: Finale uses parallel array format (columns + data arrays)

### Deployment Issues
1. **Vercel Timeouts**: API routes have 60-second limit, ensure operations complete within this time
2. **Environment Variables**: Verify all required variables are set in Vercel dashboard
3. **Build Failures**: Check TypeScript errors with `npm run type-check`

### Testing Issues
1. **Playwright Port Conflicts**: Uses port 3001, ensure it's available
2. **Test Database**: Some tests require database access, ensure connection is configured
3. **Flaky Tests**: Creative tests may need adjustment based on data state

## Performance Optimization Tips

1. **Batch Operations**: Process inventory in batches of 50-100 items
2. **Caching**: Implement caching for frequently accessed data
3. **Pagination**: Use pagination for large datasets in UI
4. **Query Optimization**: Use specific select() clauses in Supabase queries
5. **Parallel Processing**: Use Promise.all() for independent operations

## Security Considerations

1. **API Key Storage**: Never commit API keys, use environment variables
2. **Input Validation**: Always validate and sanitize user input using Zod schemas
3. **SQL Injection**: Use parameterized queries with Supabase
4. **CORS**: Configure appropriate CORS headers for API routes
5. **Rate Limiting**: Rate limiter utility available in `/app/lib/rate-limiter.ts`
6. **Authentication**: JWT-based auth system with secure httpOnly cookies
7. **CSRF Protection**: CSRF tokens required for state-changing operations
8. **Error Handling**: Never expose sensitive error details to clients

## Key Implementation Guidance

### From GitHub Copilot Instructions
- Focus on performance and optimization using modern React patterns
- Use server components where possible for better performance
- Implement proper error boundaries and loading states
- Follow accessibility best practices (WCAG 2.1 AA)
- Ensure responsive design across all device sizes
- Implement comprehensive error handling with user-friendly messages
- Follow security best practices including input validation
- Write maintainable code with clear naming conventions
- Document complex business logic inline
- Use environment variables for all configuration
- Implement proper logging for debugging
- Follow RESTful API design principles
- Ensure all database queries are optimized
- Implement proper caching strategies
- Use TypeScript strictly for type safety

### Workflow Best Practices
- Always run tests before committing (`npm run test` and `npm run test:e2e`)
- Use descriptive commit messages following conventional commits
- Create feature branches for new functionality
- Write tests for new features and bug fixes
- Check CI/CD status before merging PRs
- Monitor deployment health after releases

## Authentication & CSRF Pattern

### Authentication Flow
```typescript
// Login endpoint
POST /api/auth/login
Body: { email, password }
Response: Sets httpOnly JWT cookie

// Check authentication
GET /api/auth/me
Headers: Cookie with JWT token
Response: User data or 401

// Logout
POST /api/auth/logout
Response: Clears JWT cookie
```

### CSRF Protection
```typescript
// Client-side hook
import { useCSRF } from '@/app/hooks/useCSRF'

function MyComponent() {
  const { csrfToken, isLoading } = useCSRF()
  
  const handleSubmit = async (data) => {
    await fetch('/api/endpoint', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(data)
    })
  }
}
```

## Additional Utilities

### Client Fetch Wrapper
Use the client fetch wrapper for automatic CSRF and error handling:
```typescript
import { clientFetch } from '@/app/lib/client-fetch'

// Automatically includes CSRF token for mutations
const data = await clientFetch('/api/inventory', {
  method: 'POST',
  body: { sku: 'TEST-001', quantity: 100 }
})
```

### Error Types
Consistent error handling across the application:
```typescript
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} from '@/app/lib/errors'

// In API routes
if (!isValid) {
  throw new ValidationError('Invalid input data')
}
```

### Caching (Redis)
Optional Redis caching for performance:
```typescript
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'

// Cache inventory data
const cached = await getCachedData('inventory:all')
if (!cached) {
  const data = await fetchInventory()
  await setCachedData('inventory:all', data, 300) // 5 min TTL
}
```

## Documentation References

Detailed guides available in `/docs/`:
- [Database Migration Guide](docs/database-migration-guide.md) - Step-by-step database setup
- [Playwright Creative Testing Guide](docs/playwright-creative-guide.md) - Advanced testing patterns
- [Vercel Deployment Guide](docs/vercel_deployment_guide.md) - Deployment configuration
- [Settings Backend Guide](docs/settings-backend-guide.md) - Settings implementation details

## Important Notes

- When running lint and type-check commands fail, check for:
  - Missing imports or type definitions
  - Unused variables or imports
  - TypeScript strict mode violations
  - ESLint configuration issues in `.eslintrc.json`

- For database operations:
  - Always handle the case where settings might not exist (use `maybeSingle()`)
  - Use `upsert` for settings operations to handle both insert and update
  - Check migration status before running the application

- For testing:
  - Playwright tests use port 3001 by default
  - Jest tests may require database connection
  - Use `npm run test:all` for comprehensive testing before deployment