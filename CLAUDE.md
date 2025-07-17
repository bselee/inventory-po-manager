# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Basic commands
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Check TypeScript types
npm run setup      # Run database setup

# Deployment commands
npm run deploy     # Deploy to Vercel using deployment script
npm run deploy:check # Check deployment readiness
./scripts/deploy-vercel.sh YOUR_VERCEL_TOKEN # Force fresh deployment
```

## Architecture Overview

This is a Next.js 14 application using the App Router for managing inventory and purchase orders. The application integrates with external services (Finale Inventory, Google Sheets, SendGrid) and uses Supabase as the database.

### Key Architectural Decisions

1. **API Routes**: All backend logic is in `/app/api/*` using Next.js route handlers. Each route returns JSON responses with consistent error handling patterns.

2. **Database Access**: Direct Supabase client usage via `/app/lib/supabase.ts`. No ORM or query builder is used.

3. **External Services**: Integration logic is centralized in:
   - `/app/lib/finale-api.ts` - Finale API key authentication
   - `/app/lib/finale-session-api.ts` - Finale session-based authentication (username/password)
   - Google Sheets and SendGrid integrations

4. **Type Safety**: TypeScript strict mode is enabled. Types are defined in `/app/types/*` files.

5. **State Management**: Client-side state uses React hooks. No global state management library.

6. **File Processing**: Built-in support for CSV, Excel (xlsx), and PDF generation using dedicated libraries.

7. **Styling**: Tailwind CSS with forms plugin for consistent UI components.

## Important Implementation Notes

### API Routes Pattern
All API routes follow this structure:
```typescript
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

### Database Operations
Use the Supabase client directly:
```typescript
import { supabase } from '@/app/lib/supabase'

const { data, error } = await supabase
  .from('table_name')
  .select('*')
```

### Environment Variables
Required environment variables (set in Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for migrations and admin operations)
- Finale API credentials (choose one method):
  - API Key auth: `FINALE_API_KEY`, `FINALE_API_SECRET`
  - Session auth: `finale_username`, `finale_password` (stored in database)
  - Both methods require: `FINALE_ACCOUNT_PATH`
- `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
- Google Sheets API configuration

### TypeScript Configuration
- Target: ES5 with modern lib features
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Module resolution: bundler

### Current State
- Most API routes are fully implemented with actual functionality
- `/api/sync-finale` is the primary sync endpoint with full implementation
- Finale authentication supports both API key and session-based auth
- Database migrations are managed via SQL scripts in `/scripts`
- Comprehensive troubleshooting documentation in `/docs/vercel_troubleshooting.md`
- Health check endpoint at `/api/health` for monitoring

## Database Migrations

Database migrations are managed through SQL scripts in `/scripts`:

### Running Migrations
1. **Recommended: Via Supabase Dashboard**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `/scripts/complete-migration.sql`
   - Run the query

2. **Alternative: Using Node.js script**
   ```bash
   node scripts/run-supabase-migration.js
   ```

### Migration Files
- `complete-migration.sql` - All migrations in one file
- `add-sales-cost-fields.sql` - Sales tracking fields
- `add-finale-po-sync.sql` - Purchase order sync fields
- `add-finale-auth-fields.sql` - Session authentication fields

See `/docs/database-migration-guide.md` for detailed instructions.

## Testing

### API Testing Tools
```bash
# Test Finale API connection
node scripts/test-finale-api.js

# Validate environment variables
node scripts/validate-env.js

# Test specific services
curl https://your-app.vercel.app/api/test-connection/finale
curl https://your-app.vercel.app/api/test-connection/supabase
```

## Deployment

The application auto-deploys to Vercel on push to the main branch.

### Deployment Scripts
```bash
# Force fresh deployment (fixes stuck deployments)
./scripts/deploy-vercel.sh YOUR_VERCEL_TOKEN

# Check deployment readiness
node scripts/vercel-deploy.js

# Clean up and optimize
node scripts/deployment-cleanup.js
```

### Vercel Configuration (`vercel.json`)
- 60-second timeout for API routes
- Security headers (HSTS, X-Frame-Options, etc.)
- Redirect from root to `/inventory`
- Health check endpoint rewrite
- Daily cron job for Finale sync at noon UTC (Hobby plan compatible)
- Uses `npm ci` for installation

### Build Configuration
- TypeScript errors are ignored during build (for development flexibility)
- ESLint errors are ignored during build
- SWC minification is disabled to prevent optimization issues

### Troubleshooting Deployments
See `/docs/vercel_troubleshooting.md` for:
- Common deployment errors and solutions
- Environment variable configuration
- Build optimization tips
- Emergency deployment procedures
- Fixing "deployment stuck on old commit" issues

## Finale API Integration

### Authentication Methods

1. **API Key Authentication** (Traditional)
   ```typescript
   // Uses FINALE_API_KEY and FINALE_API_SECRET
   import { FinaleApiService } from '@/lib/finale-api'
   ```

2. **Session-Based Authentication** (Alternative)
   ```typescript
   // Uses username/password stored in database
   import { FinaleSessionApiService } from '@/lib/finale-session-api'
   ```

### Key API Endpoints
- `/api/sync-finale` - Main sync endpoint (POST for sync, GET for status)
- `/api/test-finale` - Test Finale connection
- `/api/test-finale-session` - Test session-based auth
- `/api/sync-vendors` - Sync vendor data
- `/api/purchase-orders/sync-finale` - Sync purchase orders
- `/api/cron/sync-finale` - Automated daily sync

### Sync Features
- Inventory sync with cost and sales data
- Purchase order synchronization
- Vendor mapping and sync
- Dry run mode for testing
- Comprehensive error logging in `sync_logs` table

## Common Development Patterns

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('Context:', error)
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  )
}
```

### Database Queries with Error Handling
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  
if (error) {
  console.error('Database error:', error)
  throw new Error(`Failed to fetch data: ${error.message}`)
}
```

### API Route Response Patterns
- Always return JSON with consistent structure
- Include `success` boolean for operations
- Use appropriate HTTP status codes
- Log errors with context for debugging

## Utility Scripts

Located in `/scripts`:
- `test-finale-api.js` - Interactive Finale API tester
- `validate-env.js` - Environment variable validator
- `run-migrations.js/ts` - Database migration runners
- `deploy-vercel.sh` - Deployment automation
- `vercel-deploy.js` - Deployment readiness checker
- `deployment-cleanup.js` - Build optimization