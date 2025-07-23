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

# Testing - Jest
npm run test              # Run all Jest tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:api          # Run API-specific tests
npm run test:unit         # Run unit tests
npm run test:integration  # Run integration tests
npm run test:db           # Run database tests
npm run test:health       # Run health check script

# Testing - Playwright
npm run test:e2e          # Run all Playwright tests
npm run test:e2e:ui       # Run with Playwright UI mode
npm run test:e2e:headed   # Run in headed browser mode
npm run test:e2e:debug    # Run in debug mode
npm run test:crawl        # Run application crawler test
npm run test:health-e2e   # Run E2E health check
npm run test:inventory    # Test inventory page
npm run test:settings     # Test settings page
npm run test:comprehensive # Run comprehensive test suite
npm run test:all          # Run Jest + Playwright tests

# Database
npm run db:migrate   # Run database migrations
npm run db:validate  # Validate database schema
npm run db:backup    # Backup database

# Deployment
npm run deploy       # Deploy to Vercel
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
- Playwright E2E tests implemented with creative testing patterns
- Production-ready with extensive monitoring and alerting

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

- Detailed deployment guides and troubleshooting available in `/docs/`