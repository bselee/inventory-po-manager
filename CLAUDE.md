# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Check TypeScript types
npm run setup      # Run database setup (currently empty)
npm run deploy     # Deploy to Vercel
npm run deploy:check # Check Vercel deployment status
```

## Architecture Overview

This is a Next.js 14 application using the App Router for managing inventory and purchase orders. The application integrates with external services (Finale Inventory, Google Sheets, SendGrid) and uses Supabase as the database.

### Key Architectural Decisions

1. **API Routes**: All backend logic is in `/app/api/*` using Next.js route handlers. Each route returns JSON responses with consistent error handling patterns.

2. **Database Access**: Direct Supabase client usage via `/app/lib/supabase.ts`. No ORM or query builder is used.

3. **External Services**: Integration logic is centralized in `/app/lib/finale-api.ts` for Finale, Google Sheets, and SendGrid.

4. **Type Safety**: TypeScript strict mode is enabled. Types are defined in `/app/types/*` files.

5. **State Management**: Client-side state uses React hooks. No global state management library.

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
- `FINALE_API_*` (credentials for Finale integration)
- `SENDGRID_*` (email service credentials)
- Google Sheets API configuration

Additional environment variables may be required based on enabled features:
- Authentication providers (if implementing auth)
- Additional service integrations

### Finale API Integration

The Finale API service (`/app/lib/finale-api.ts`) handles all Finale operations:
- **Authentication**: Uses Basic Auth with API key/secret
- **Base URL Pattern**: `https://app.finaleinventory.com/{account}/api/`
- **Key Endpoints**:
  - `/products` - Inventory data with pagination (100 items max per request)
  - `/vendors` (plural) - Vendor management
  - `/purchaseOrder` - Purchase order operations
- **Response Format**: Handles parallel array format (columns + data arrays)
- **Date Filtering**: Inventory sync supports filtering by year (default: current year)
- **Error Handling**: Comprehensive error messages and retry logic

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
- `/api/cron/sync-finale`: Runs every 6 hours
- `/api/cron/check-inventory`: Daily inventory level checks
- `/api/cron/cleanup`: Weekly cleanup tasks

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
- Authentication/authorization is not yet implemented
- Test files exist but contain only stubs
- Production-ready with extensive monitoring and alerting

### Critical Deployment Notes
- Settings are stored in the `settings` table with id=1
- Use `upsert` operations for settings to handle both insert and update cases
- The `getFinaleConfig` helper uses `maybeSingle()` to handle missing records gracefully
- Vendor endpoints use plural form (`/vendors` not `/vendor`)

## Testing

Tests are located in `__tests__` directories within API routes. To run tests:
```bash
# Note: Jest is not configured yet. When implementing tests:
# 1. Add Jest configuration
# 2. Update package.json with test script
# 3. Implement actual test cases
```

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

### Critical Deployment Notes
- Settings are stored in the `settings` table with id=1
- Use `upsert` operations for settings to handle both insert and update cases
- The `getFinaleConfig` helper uses `maybeSingle()` to handle missing records gracefully
- Vendor endpoints use plural form (`/vendors` not `/vendor`)
- Detailed deployment guides and troubleshooting available in `/docs/`

## Sync Implementation Details

### Sync Strategies
The Finale sync system (`/app/lib/finale-api.ts`) implements multiple sync strategies:
1. **Smart Sync** (default): Automatically chooses strategy based on last sync time
   - < 30 minutes: Critical items only
   - 30-120 minutes: Inventory levels only
   - 120-1440 minutes: Active products only
   - > 24 hours: Full sync
2. **Full Sync**: Complete product catalog with inventory (year-filtered by default)
3. **Inventory-Only**: Just stock levels update (fastest)
4. **Critical Items**: Low stock and reorder-needed items
5. **Active Products**: Skips discontinued/inactive items

### Rate Limiting & Error Handling
- **Batch Processing**: 50-100 items per batch
- **Retry Logic**: Exponential backoff with 3 retries max
  - Initial retry: 1 second
  - Max backoff: 10 seconds
- **Stuck Sync Detection**: Syncs running > 30 minutes are marked as failed
- **Concurrent Sync Prevention**: Returns 409 if sync already running

### Cron Jobs Configuration
Defined in `vercel.json`:
- `/api/cron/sync-finale`: Daily at 2 AM UTC
- `/api/cron/sync-inventory`: Every 6 hours
- `/api/cron/sync-vendors`: Daily at 4 AM UTC

Note: Cron frequency must be compatible with Vercel plan limits

### Email Alerts
The system sends email alerts via SendGrid for:
- Sync failures
- Partial sync completions (with warnings)
- Stuck syncs (> 30 minutes)
- Out-of-stock items
- Items needing reorder
- Successful recovery from previous failures

Configure in settings: `sendgrid_api_key` and `alert_email`

### API Timeout Settings
- All API routes: 60-second timeout (configured in `vercel.json`)
- Health check endpoint: `/api/health` (rewritten from `/health`)
- Use streaming responses for large data sets when possible

### Deployment Validation
The deployment scripts include:
- Git status checking
- Remote sync verification
- Local build testing
- Health check validation after deployment
- Automatic retries for transient failures

Run deployment checks with:
```bash
npm run deploy:check  # Pre-deployment validation
npm run deploy        # Full deployment with checks
```