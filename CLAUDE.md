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
npm run db:restore   # Restore database from backup

# Deployment
npm run deploy       # Deploy to Vercel (runs scripts/deploy-vercel.sh)
npm run deploy:check # Check Vercel deployment status

# Cache Management (Redis)
npm run cache:clear  # Clear inventory cache
npm run cache:warm   # Warm up cache
npm run cache:health # Check cache health
npm run cache:test   # Test cache with force refresh
npm run redis:test   # Test Redis connection
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

4. **Caching Infrastructure**: Redis caching available via `/app/lib/cache/redis-client.ts` for performance optimization. Cache service patterns in `/app/lib/finale-cache-service.ts` with advanced caching strategies in `/app/lib/cache/caching-strategy.ts`.

5. **Rate Limiting**: Implemented in `/lib/finale-rate-limiter.ts` for external API calls.

6. **Type Safety**: TypeScript strict mode is enabled. Types are defined in `/app/types/*` files.

7. **State Management**: Client-side state uses React hooks. No global state management library.

## Processing Queries

### Claude Code Notes on Queries
- **Query 1 and #3 Relevance**: 
  * This context suggests examining API routes or external service integrations
  * Specific focus on 1 and #3 implies extracting details about API routes and external service patterns

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

[Rest of the existing content remains unchanged]