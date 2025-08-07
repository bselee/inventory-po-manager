# Supabase Migration Report

## Executive Summary
This report provides a comprehensive analysis of Supabase usage across the codebase and a detailed migration plan to replace Supabase with Vercel Redis and Finale Reports API.

## Current Supabase Dependencies

### 1. Database Tables Used
The application currently uses 5 main Supabase tables:

1. **inventory_items** - Core inventory data
   - Stores SKU, stock levels, costs, sales data
   - Tracks 30/90 day sales metrics
   - Finale sync status tracking
   
2. **purchase_orders** - Purchase order management
   - Vendor relationships
   - Order tracking
   - Finale sync status
   
3. **vendors** - Vendor management
   - Contact information
   - Payment terms
   - Finale integration IDs
   
4. **settings** - Application configuration
   - API credentials
   - Sync configuration
   - Email alert settings
   - Always uses single row (id=1)
   
5. **sync_logs** - Sync history tracking
   - Sync type and status
   - Error tracking
   - Performance metrics

### 2. Files with Supabase Imports (62 total)

#### Core Library Files
- `/app/lib/supabase.ts` - Main Supabase client
- `/app/lib/data-access.ts` - Primary data access layer
- `/app/lib/data-access/inventory.ts` - Inventory operations
- `/app/lib/data-access/settings.ts` - Settings operations
- `/app/lib/data-access/vendors.ts` - Vendor operations
- `/app/lib/data-access/sync-logs.ts` - Sync logging

#### Service Files Using Supabase
- `/app/lib/auth.ts` - Authentication (users table)
- `/app/lib/enhanced-sync-service.ts` - Sync orchestration
- `/app/lib/finale-api.ts` - Finale integration
- `/app/lib/sync-logger.ts` - Sync logging service
- `/app/lib/sync-scheduler.ts` - Sync scheduling
- `/app/lib/email-alerts.ts` - Alert system
- `/app/lib/real-time-monitor.ts` - Real-time monitoring
- `/app/lib/inventory-forecast.ts` - Forecasting

#### API Routes Using Supabase (27 routes)
- **Settings Routes**: `/api/settings/*`, `/api/settings-redis/route.ts`
- **Sync Routes**: `/api/sync-finale/*` (12 routes)
- **Vendor Routes**: `/api/vendors/*`, `/api/sync-vendors/*`
- **Purchase Order Routes**: `/api/purchase-orders/*`
- **Inventory Routes**: `/api/sync-inventory/*`
- **Cron Routes**: `/api/cron/sync-*` (3 routes)
- **Health/Status Routes**: `/api/health/*`, `/api/sync-logs/*`

#### Client Components Using Supabase (2 components)
- `/app/components/CriticalItemsMonitor.tsx` - Critical stock monitoring
- `/app/components/SalesDataUploader.tsx` - Sales data import

#### Hooks Using Supabase
- `/app/hooks/useInventoryRealtime.ts` - Real-time inventory updates

### 3. Key Functionality Dependencies

#### A. Core Data Operations
- Inventory CRUD operations
- Purchase order management
- Vendor management
- Settings persistence

#### B. Sync Infrastructure
- Sync status tracking
- Sync history logging
- Concurrent sync prevention
- Stuck sync detection

#### C. Real-time Features
- Inventory real-time updates
- Critical item monitoring
- Live sync status

#### D. Authentication
- User management (minimal usage)
- JWT token validation

## Migration Strategy

### Phase 1: Settings Migration (Priority: HIGH)
**Current**: Settings stored in Supabase table (single row)
**Target**: Vercel Redis or environment variables

#### Implementation:
1. Create Redis key structure: `settings:app:config`
2. Migrate all settings to Redis hash
3. Update `/app/lib/data-access/settings.ts` to use Redis
4. Keep environment variables as fallback

#### Files to Update:
- `/app/lib/data-access/settings.ts`
- `/app/lib/finale-api.ts`
- `/app/lib/finale-session-api.ts`
- `/app/lib/finale-multi-report-service.ts`
- `/app/api/settings/route.ts`
- `/app/api/settings-redis/route.ts`
- `/app/settings/page.tsx`

### Phase 2: Inventory Data Migration (Priority: CRITICAL)
**Current**: inventory_items table with 2000+ rows
**Target**: Finale Reports API + Redis caching

#### Implementation:
1. Use Finale Reports API as primary data source
2. Implement Redis caching layer:
   - Key pattern: `inventory:sku:{sku}`
   - List keys: `inventory:list:page:{page}`
   - TTL: 5-15 minutes for live data
3. Create new service: `/app/lib/finale-inventory-service.ts`
4. Implement cache warming strategy

#### Files to Update:
- `/app/lib/data-access/inventory.ts`
- `/app/lib/inventory-forecast.ts`
- `/app/lib/real-time-monitor.ts`
- `/app/api/inventory/route.ts`
- `/app/api/inventory-enhanced/route.ts`
- `/app/hooks/useInventoryRealtime.ts`

### Phase 3: Sync Logs Migration (Priority: MEDIUM)
**Current**: sync_logs table for history
**Target**: Redis sorted sets with expiration

#### Implementation:
1. Use Redis sorted sets: `sync:logs`
2. Score by timestamp
3. Implement auto-expiration (30 days)
4. Keep only essential sync metadata

#### Files to Update:
- `/app/lib/data-access/sync-logs.ts`
- `/app/lib/sync-logger.ts`
- `/app/lib/sync-scheduler.ts`
- `/app/api/sync-logs/route.ts`
- `/app/api/sync-finale/history/route.ts`

### Phase 4: Vendors Migration (Priority: MEDIUM)
**Current**: vendors table
**Target**: Finale Reports API + Redis cache

#### Implementation:
1. Fetch vendors from Finale `/report` endpoint
2. Cache in Redis: `vendors:list` and `vendors:id:{id}`
3. Update vendor sync to use Finale as source

#### Files to Update:
- `/app/lib/data-access/vendors.ts`
- `/app/lib/finale-vendors.ts`
- `/app/api/vendors/route.ts`
- `/app/api/sync-vendors/route.ts`

### Phase 5: Purchase Orders Migration (Priority: LOW)
**Current**: purchase_orders table
**Target**: Finale API direct access

#### Implementation:
1. Use Finale `/purchaseOrder` endpoint directly
2. No caching needed (low volume)
3. Remove local PO storage

#### Files to Update:
- `/app/api/purchase-orders/route.ts`
- `/app/api/purchase-orders/sync-finale/route.ts`

### Phase 6: Remove Supabase Dependencies
1. Remove `/app/lib/supabase.ts`
2. Remove `/lib/supabase.ts`
3. Remove `@supabase/supabase-js` from package.json
4. Remove Supabase environment variables
5. Update deployment configuration

## Technical Implementation Details

### Redis Data Structure Design

```typescript
// Settings
settings:app:config = {
  finale_api_key: string,
  finale_api_secret: string,
  finale_account_path: string,
  sync_enabled: boolean,
  // ... other settings
}

// Inventory
inventory:sku:{sku} = {
  sku: string,
  product_name: string,
  stock: number,
  cost: number,
  // ... other fields
}
inventory:list:page:{page} = [sku1, sku2, ...]
inventory:metadata = {
  total_items: number,
  last_sync: timestamp
}

// Sync Logs (sorted set)
sync:logs = {
  score: timestamp,
  member: JSON.stringify(log_data)
}

// Vendors
vendors:list = [vendor_ids]
vendors:id:{id} = vendor_data
```

### New Service Architecture

```typescript
// /app/lib/finale-inventory-service.ts
export class FinaleInventoryService {
  private redis: RedisClient
  private finaleApi: FinaleReportAPI
  
  async getInventory(filters?: Filters): Promise<InventoryItem[]> {
    // 1. Check Redis cache
    // 2. If miss, fetch from Finale Reports API
    // 3. Cache results
    // 4. Return data
  }
  
  async refreshCache(): Promise<void> {
    // Warm cache with Finale data
  }
}
```

## Migration Timeline

### Week 1: Preparation
- Set up Redis infrastructure
- Create new service classes
- Implement cache layer utilities

### Week 2: Settings & Sync Logs
- Migrate settings to Redis
- Migrate sync logs to Redis
- Test sync operations

### Week 3: Inventory Migration
- Implement Finale Reports integration
- Set up Redis caching for inventory
- Migrate real-time features

### Week 4: Vendors & POs
- Migrate vendor data
- Update purchase order flows
- Remove Supabase dependencies

### Week 5: Testing & Cleanup
- Comprehensive testing
- Remove Supabase client
- Update documentation

## Risk Assessment

### High Risk Areas
1. **Real-time Features**: Need WebSocket alternative or polling
2. **Data Consistency**: Ensure cache invalidation strategy
3. **Performance**: Redis must handle high read volume
4. **Sync Status**: Critical for preventing duplicate syncs

### Mitigation Strategies
1. Implement Redis pub/sub for real-time updates
2. Use cache versioning and TTLs
3. Implement Redis connection pooling
4. Use Redis atomic operations for sync locks

## Benefits of Migration

1. **Reduced Dependencies**: Single data source (Finale)
2. **Better Performance**: Redis caching faster than Supabase
3. **Cost Optimization**: Eliminate Supabase costs
4. **Simplified Architecture**: Fewer moving parts
5. **Real-time Data**: Direct from Finale Reports API

## Rollback Plan

1. Keep Supabase configuration for 30 days
2. Implement feature flags for gradual rollout
3. Maintain parallel systems during transition
4. Daily backups of Redis data
5. Quick switch back capability via environment variables

## Testing Requirements

### Unit Tests
- New service classes
- Cache operations
- Data transformation

### Integration Tests
- Finale Reports API integration
- Redis operations
- End-to-end workflows

### Performance Tests
- Load testing Redis cache
- API response times
- Concurrent operation handling

## Monitoring & Observability

1. Redis connection monitoring
2. Cache hit/miss ratios
3. Finale API call tracking
4. Error rate monitoring
5. Performance metrics dashboard

## Conclusion

The migration from Supabase to Vercel Redis + Finale Reports API is technically feasible and will simplify the architecture. The highest priority is migrating inventory data and settings, as these are core to the application's functionality. The migration should be done in phases with careful testing at each stage to ensure data integrity and system stability.

Total estimated effort: 4-5 weeks with one developer
Risk level: Medium (mitigated by phased approach)
Expected benefits: Improved performance, reduced costs, simplified architecture