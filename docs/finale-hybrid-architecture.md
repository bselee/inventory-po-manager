# Finale Reporting API Hybrid Architecture Guide

## Overview

This guide explains the hybrid architecture that combines Finale's Reporting API with Supabase caching for optimal performance, reliability, and data completeness.

## Architecture Benefits

### 🚀 Performance

- **Fast Initial Load**: Cached data provides instant responses
- **Background Refresh**: API calls happen asynchronously
- **Smart Fallbacks**: Cache serves data during API downtime
- **Optimized Queries**: Supabase handles complex filtering/sorting

### 🔄 Data Freshness

- **Real-time Priority**: Always attempts fresh data first
- **Intelligent Caching**: 15-minute cache invalidation
- **Force Refresh**: Manual refresh option available
- **Staleness Indicators**: UI shows data age

### 💪 Reliability

- **Multiple Fallbacks**: API → Cache → Default values
- **Error Recovery**: Graceful handling of API failures
- **Rate Limiting**: Built-in request throttling
- **Connection Resilience**: Works during network issues

## Implementation

### 1. Set Up Cache Table

Run the migration to create the inventory cache table:

```bash
npm run db:migrate:cache
```

Or manually run the SQL in Supabase:

```sql
-- See scripts/create-inventory-cache-table.sql
CREATE TABLE inventory_cache (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT,
  current_stock INTEGER DEFAULT 0,
  cost DECIMAL(10, 2),
  vendor TEXT,
  location TEXT,
  finale_data JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Configure Finale Report Settings

In your settings page, configure the Finale Report URL:

```
Settings → Finale Integration → Report URL
Example: https://finale.inventory.com/reports/inventory-detail
```

### 3. Usage Examples

#### Basic Inventory Loading
```typescript
import { hybridInventoryService } from '@/lib/hybrid-inventory-service';

// Load inventory with hybrid approach
const inventory = await hybridInventoryService.getInventory({
  useCache: true,          // Try cache first
  maxCacheAge: 15,         // 15 minutes
  forceRefresh: false      // Allow cache
});
```

#### Force Fresh Data
```typescript
// Force API refresh (ignores cache)
const freshInventory = await hybridInventoryService.getInventory({
  forceRefresh: true
});
```

#### Search with Caching
```typescript
// Search with cache fallback
const results = await hybridInventoryService.searchInventory('widget', {
  useCache: true,
  fields: ['sku', 'product_name', 'current_stock']
});
```

## API Endpoints

### GET /api/inventory/hybrid
Primary endpoint for hybrid inventory data:

```typescript
// Request with caching
GET /api/inventory/hybrid?useCache=true&maxAge=15

// Force refresh
GET /api/inventory/hybrid?forceRefresh=true

// Specific fields only
GET /api/inventory/hybrid?fields=sku,product_name,current_stock
```

### GET /api/test-report-api
Test endpoint for Finale Report API connectivity:

```bash
curl -X GET "http://localhost:3000/api/test-report-api"
```

## Data Flow

### 1. Happy Path (API Available)
```
Request → Check Cache Age → Call Finale API → Update Cache → Return Fresh Data
```

### 2. Cache Hit (Recent Data)
```
Request → Check Cache Age → Cache Valid → Return Cached Data
```

### 3. API Failure (Fallback)
```
Request → Call Finale API → API Fails → Return Cached Data → Log Warning
```

### 4. Complete Failure (Graceful Degradation)
```
Request → API Fails → No Cache → Return Empty Array → User Notification
```

## Cache Management

### Automatic Invalidation
- **Time-based**: 15-minute default expiry
- **Event-based**: Manual refresh triggers
- **Size-based**: LRU eviction for large datasets

### Manual Cache Control
```typescript
// Clear specific SKU cache
await hybridInventoryService.clearCache('SKU123');

// Clear all inventory cache
await hybridInventoryService.clearAllCache();

// Get cache statistics
const stats = await hybridInventoryService.getCacheStats();
```

## Performance Monitoring

### Built-in Metrics
```typescript
// Service provides performance data
const metrics = hybridInventoryService.getMetrics();
console.log(metrics);
// {
//   apiCalls: 42,
//   cacheHits: 38,
//   avgResponseTime: 250,
//   errorRate: 0.02
// }
```

### Error Tracking
All API failures and fallbacks are logged:

```typescript
// Check service health
const health = await hybridInventoryService.healthCheck();
// {
//   api: 'healthy',
//   cache: 'healthy', 
//   lastSync: '2024-01-15T10:30:00Z'
// }
```

## Environment Configuration

### Required Environment Variables
```bash
# Finale Report API
FINALE_REPORT_URL=https://your-finale-instance.com/reports/inventory
FINALE_API_KEY=your-api-key

# Supabase (for caching)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Cache configuration
CACHE_MAX_AGE_MINUTES=15
CACHE_MAX_SIZE_MB=50
```

## Migration Strategy

### Phase 1: Setup (Current)
1. ✅ Create cache table
2. ✅ Implement hybrid service
3. ✅ Add test endpoints
4. ⏳ Configure settings integration

### Phase 2: Integration
1. Update inventory page to use hybrid service
2. Add cache status indicators to UI
3. Implement manual refresh controls
4. Add performance monitoring dashboard

### Phase 3: Optimization
1. Implement predictive caching
2. Add batch update operations
3. Optimize database queries
4. Add advanced error recovery

## Troubleshooting

### Common Issues

#### Cache Not Updating
```bash
# Check cache table
SELECT * FROM inventory_cache ORDER BY cached_at DESC LIMIT 10;

# Clear cache manually
DELETE FROM inventory_cache WHERE cached_at < NOW() - INTERVAL '1 hour';
```

#### Finale API Errors
```bash
# Test API connectivity
npm run test:api

# Check report URL in settings
curl -X GET "http://localhost:3000/api/test-report-api"
```

#### Performance Issues
```typescript
// Enable debug logging
process.env.DEBUG_HYBRID_SERVICE = 'true';

// Check service metrics
const metrics = await hybridInventoryService.getMetrics();
```

## Best Practices

### 1. Cache Strategy
- Use 15-minute cache for most operations
- Force refresh for critical updates
- Monitor cache hit rates

### 2. Error Handling
- Always provide fallback data
- Log errors for monitoring
- Show user-friendly messages

### 3. Performance
- Batch operations when possible
- Use appropriate cache durations
- Monitor API rate limits

### 4. Security
- Validate all API responses
- Sanitize cached data
- Use proper authentication

## Monitoring and Alerts

### Key Metrics to Watch
- Cache hit ratio (target: >80%)
- API response time (target: <2s)
- Error rate (target: <5%)
- Cache size growth

### Recommended Alerts
- API failures > 10% over 5 minutes
- Cache miss rate > 50% over 10 minutes
- Inventory sync delays > 30 minutes
- Database connection errors

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live data
- **Predictive Caching**: Pre-load frequently accessed items
- **Advanced Analytics**: Detailed performance insights
- **Multi-tenant Support**: Separate caches per organization
- **GraphQL Integration**: Flexible data querying
- **Offline Support**: Local storage fallbacks

This hybrid approach provides the best of both worlds: the completeness and freshness of direct API access with the performance and reliability of cached data storage.
