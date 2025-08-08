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
npm run test:coverage     # Run tests with coverage report (60% threshold)
npm run test:api          # Run API-specific tests
npm run test:unit         # Run unit tests
npm run test:integration  # Run integration tests
npm run test:db           # Run database tests

# Run a single Jest test file
npm run test -- app/api/inventory/__tests__/route.test.ts

# Testing - Playwright
npm run test:e2e          # Run all Playwright tests
npm run test:e2e:ui       # Run with Playwright UI mode
npm run test:e2e:headed   # Run in headed browser mode
npm run test:e2e:debug    # Run in debug mode
npm run test:crawl        # Run application crawler test
npm run test:inventory    # Test inventory page
npm run test:inventory:comprehensive  # Comprehensive inventory tests with HTML report
npm run test:settings     # Test settings page
npm run test:all          # Run Jest + Playwright tests

# Run a single Playwright test file
npx playwright test tests/e2e/specific-test.spec.ts
# Run tests matching a pattern
npx playwright test -g "should sync inventory"

# Database
npm run db:migrate   # Run database migrations
npm run db:validate  # Validate database schema
npm run db:backup    # Backup database
npm run db:restore   # Restore database from backup

# Deployment
npm run deploy       # Deploy to Vercel (runs scripts/deploy-vercel.sh)
npm run deploy:check # Check Vercel deployment status
npm run deploy:summary # Show deployment summary
npm run deploy:history # Show deployment history

# Cache Management (Redis)
npm run cache:clear  # Clear inventory cache
npm run cache:warm   # Warm up cache
npm run cache:health # Check cache health
npm run cache:test   # Test cache with force refresh
npm run redis:test   # Test Redis connection

# Email Testing
npm run test:email   # Test email alerts functionality
```

## Architecture Overview

Enterprise-grade inventory management system built with Next.js 14 App Router, featuring intelligent purchase order automation, real-time analytics, and seamless Finale Inventory integration.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, React 18
- **Backend**: Next.js API routes with serverless functions
- **Database**: Supabase (PostgreSQL) with direct client access
- **Caching**: Redis for performance optimization
- **Testing**: Jest (unit/integration, 60% coverage threshold), Playwright (E2E)
- **External APIs**: Finale Inventory, SendGrid (email), Google Sheets
- **Deployment**: Vercel with automated CI/CD

### Core Features
- **Intelligent Inventory Management**: Real-time tracking with predictive analytics
- **Smart Purchase Orders**: Automated generation based on sales velocity and reorder points
- **Multi-View Dashboards**: Table view, Planning view (30/60/90 day), Analytics view
- **Advanced Business Logic**: Sales velocity analysis, stock status classification, demand trend tracking

### Directory Structure
```
app/
├── api/                   # Backend API routes (80+ endpoints)
│   ├── auth/             # Authentication endpoints
│   ├── cron/             # Scheduled tasks
│   ├── dashboard/        # Dashboard metrics
│   ├── inventory/        # Inventory management
│   ├── purchase-orders/  # PO management
│   ├── settings/         # Configuration
│   ├── sync-finale/      # Finale integration
│   └── vendors/          # Vendor management
├── components/           # Reusable React components
│   ├── common/          # Shared components
│   ├── dashboard/       # Dashboard-specific
│   ├── inventory/       # Inventory UI components
│   └── purchase-orders/ # PO components
├── hooks/               # Custom React hooks
├── lib/                 # Core business logic
│   ├── cache/          # Redis caching strategies
│   ├── data-access/    # Database operations
│   └── monitoring/     # Performance tracking
├── types/              # TypeScript definitions
└── [pages]/           # Next.js pages

tests/
├── e2e/               # Playwright end-to-end tests
├── creative/          # Advanced business logic tests
└── setup.ts          # Test configuration
```

## Key Architectural Patterns

### API Routes Pattern
All API routes must include these exports for Vercel deployment:
```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET/POST/PUT/DELETE(request: Request) {
  try {
    // Input validation
    // Database/external service operations
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error message' },
      { status: 500 }
    )
  }
}
```

### Database Access
- Direct Supabase client usage via `/app/lib/supabase.ts`
- No ORM - direct SQL queries through Supabase client
- All database operations include proper error handling
- Types are defined in `/app/types/*` files

### External Service Integration
- **Finale API**: Centralized in `/app/lib/finale-api.ts` with rate limiting
- **Cache Service**: Redis via `/app/lib/cache/redis-client.ts`
- **Email**: SendGrid integration for notifications
- **Google Sheets**: Direct API integration for data export

### Testing Strategy
- **Jest Configuration**: Tests in `/tests`, `/app`, and `/lib` directories
- **Coverage Thresholds**: 60% for branches, functions, lines, statements
- **Playwright**: E2E tests with retry logic for CI environments
- **Test Timeout**: 30s for Jest, 30-60s for Playwright (longer in CI)

### Performance Optimizations
- **Redis Caching**: Multi-layer caching strategy for inventory data
- **Rate Limiting**: Implemented for external API calls (Finale)
- **Background Jobs**: Async processing for heavy operations
- **Optimized Queries**: Batch operations and pagination

### State Management
- Client-side state uses React hooks (no global state library)
- Server state managed through API routes
- Cache invalidation strategies for data consistency

## Important Notes

### Type Safety
- TypeScript strict mode is enabled
- All API responses should be properly typed
- Use interfaces for object shapes, types for unions/aliases

### Error Handling
- Consistent error response format across all APIs
- Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Comprehensive error logging via `/app/lib/logger.ts`

### Security
- CSRF protection implemented
- Input validation on all API endpoints
- Environment variables for sensitive configuration
- No secrets in code or version control

### Deployment
- Automatic deployment to Vercel on push to main branch
- Environment variables configured in Vercel dashboard
- Pre-push validation via Git hooks
- Health checks after deployment

## Common Operations

### Running a Single Test
```bash
# Jest
npm run test -- app/api/inventory/__tests__/route.test.ts

# Playwright
npx playwright test tests/e2e/inventory-page.spec.ts
```

### Debugging API Routes
Check logs in Vercel dashboard or use local development:
```bash
npm run dev
# API routes available at http://localhost:3000/api/*
```

### Cache Operations
```bash
# Clear and rebuild cache
npm run cache:clear && npm run cache:warm

# Check cache health
npm run cache:health
```

### Database Migration
```bash
# Run migrations
npm run db:migrate

# Validate schema
npm run db:validate
```

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FINALE_API_KEY`
- `FINALE_ACCOUNT_ID`
- `SENDGRID_API_KEY`
- `REDIS_URL` (optional, for caching)
- `JWT_SECRET` (for authentication)