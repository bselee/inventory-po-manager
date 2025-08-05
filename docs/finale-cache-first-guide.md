# 🚀 Finale Cache-First Architecture Guide

## Overview

This guide implements a Redis-based cache-first architecture using Vercel KV for optimal performance with Finale's Reporting API. This approach is simpler and more efficient than the hybrid Supabase approach.

## ✨ Key Benefits

### 🏎️ **Performance**
- **Sub-second response times** for cached data
- **15-minute intelligent TTL** balances freshness vs performance
- **Background refresh** keeps data current without blocking UI
- **Automatic fallback** to stale cache during API issues

### 💰 **Cost Efficient**
- **No additional database** infrastructure needed
- **Redis storage** is cheaper than database rows
- **Reduced API calls** save on Finale usage costs
- **Vercel KV integration** scales automatically

### 🔧 **Simple Architecture**
- **Single service** handles all caching logic
- **No complex sync** between multiple systems
- **Easy deployment** - just environment variables
- **Built-in monitoring** and health checks

## 🏗️ Architecture Overview

```
Request → Cache Check → Redis Hit? → Return Cached Data
                    ↓
                 Cache Miss
                    ↓
          Finale Reporting API → Transform Data → Store in Redis → Return Fresh Data
```

### Data Flow
1. **Cache First**: Always check Redis cache first
2. **Smart Refresh**: Fetch from Finale only when cache is stale
3. **Background Updates**: Async cache warming for better UX
4. **Graceful Fallback**: Return stale data if API fails

## 🚀 Setup Instructions

### 1. Install Dependencies

Dependencies are already installed:
- `@vercel/kv` - Vercel Redis integration
- `ioredis` - Redis client (fallback)

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.cache.example .env.local
```

Update with your Finale credentials:
```env
# Finale API Configuration
FINALE_API_KEY=your-finale-api-key
FINALE_API_SECRET=your-finale-api-secret
FINALE_ACCOUNT_PATH=your-account-path
FINALE_REPORT_URL=https://your-finale.com/reports/inventory

# Vercel KV (auto-configured in production)
KV_URL=redis://localhost:6379  # Development only
```

### 3. Vercel KV Setup

#### Production (Vercel):
1. Go to your project dashboard
2. Navigate to **Storage** → **KV Database**
3. Create a new KV database
4. Environment variables are auto-configured

#### Development:
Use local Redis or Upstash for development:
```bash
# Option 1: Local Redis
docker run -p 6379:6379 redis:alpine

# Option 2: Upstash Redis (recommended)
# Sign up at upstash.com and get connection details
```

## 🔧 Implementation

### Basic Usage

```typescript
import { finaleCacheService } from '@/lib/finale-cache-service';

// Get all inventory (cache-first)
const inventory = await finaleCacheService.getInventoryData();

// Force fresh data
const fresh = await finaleCacheService.getInventoryData({ 
  forceRefresh: true 
});

// Search with caching
const results = await finaleCacheService.searchInventory('widget');

// Get low stock items
const lowStock = await finaleCacheService.getLowStockItems();

// Vendor-specific inventory
const buildASoilItems = await finaleCacheService.getInventoryByVendor('BuildASoil');
```

### API Endpoints

#### GET `/api/inventory/cache`
Main endpoint for cached inventory data:

```bash
# Get cached inventory
curl "http://localhost:3000/api/inventory/cache"

# Force refresh from Finale
curl "http://localhost:3000/api/inventory/cache?forceRefresh=true"

# Custom TTL
curl "http://localhost:3000/api/inventory/cache?ttl=30"

# Search inventory
curl "http://localhost:3000/api/inventory/cache?search=widget&limit=50"

# Low stock items only
curl "http://localhost:3000/api/inventory/cache?lowStock=true"

# Vendor-specific items
curl "http://localhost:3000/api/inventory/cache?vendor=BuildASoil"
```

#### POST `/api/inventory/cache`
Cache management operations:

```bash
# Clear cache
curl -X POST "http://localhost:3000/api/inventory/cache" \
  -H "Content-Type: application/json" \
  -d '{"action": "clearCache"}'

# Warm up cache
curl -X POST "http://localhost:3000/api/inventory/cache" \
  -H "Content-Type: application/json" \
  -d '{"action": "warmUpCache"}'

# Health check
curl -X POST "http://localhost:3000/api/inventory/cache" \
  -H "Content-Type: application/json" \
  -d '{"action": "healthCheck"}'
```

### React Component Integration

```typescript
import { CacheManager } from '@/components/inventory/CacheManager';

function InventoryPage() {
  const [inventory, setInventory] = useState([]);

  const handleDataRefresh = () => {
    // Reload inventory data after cache refresh
    loadInventoryData();
  };

  return (
    <div>
      {/* Compact cache manager in header */}
      <div className="flex justify-between items-center mb-6">
        <h1>Inventory Management</h1>
        <CacheManager compact onDataRefresh={handleDataRefresh} />
      </div>

      {/* Full cache manager in settings */}
      <CacheManager showMetrics onDataRefresh={handleDataRefresh} />
      
      {/* Your inventory table */}
      <InventoryTable data={inventory} />
    </div>
  );
}
```

## 📊 Monitoring & Health Checks

### Built-in Metrics

The service automatically tracks:
- **Cache hits/misses** - Performance indicators
- **API call count** - Usage monitoring
- **Response times** - Performance metrics
- **Error rates** - Reliability tracking

### Health Check Endpoint

Monitor service health:
```typescript
const health = await fetch('/api/inventory/cache', {
  method: 'POST',
  body: JSON.stringify({ action: 'healthCheck' })
});

// Response:
{
  "success": true,
  "health": {
    "cache": "healthy",      // healthy | degraded | down
    "api": "healthy",        // healthy | degraded | down
    "metrics": {
      "totalItems": 1250,
      "cacheHits": 42,
      "cacheMisses": 3,
      "apiCalls": 3,
      "cacheAge": "5 minutes ago"
    }
  }
}
```

### Cache Performance Dashboard

The `CacheManager` component provides:
- **Real-time metrics** display
- **Manual cache control** (refresh, clear, warm-up)
- **Health status** indicators
- **Performance statistics**

## ⚙️ Configuration Options

### Cache TTL Settings

```typescript
// Default: 15 minutes
const inventory = await finaleCacheService.getInventoryData();

// Custom TTL: 5 minutes for frequently changing data
const fastMoving = await finaleCacheService.getInventoryData({ 
  ttlMinutes: 5 
});

// Extended TTL: 60 minutes for stable data
const reports = await finaleCacheService.getInventoryData({ 
  ttlMinutes: 60 
});
```

### Environment Configuration

```env
# Cache behavior
CACHE_DEFAULT_TTL_MINUTES=15    # Default cache duration
CACHE_MAX_SIZE_MB=50           # Memory limit (optional)
DEBUG_CACHE_SERVICE=true       # Enable debug logging

# Finale API limits
FINALE_RATE_LIMIT_PER_MINUTE=100  # API rate limiting
FINALE_REQUEST_TIMEOUT=30000      # Request timeout (ms)
```

## 🔄 Migration from Current System

### Phase 1: Parallel Implementation
1. ✅ Deploy cache service alongside current system
2. ✅ Set up monitoring and health checks
3. ✅ Test with subset of inventory operations

### Phase 2: Gradual Migration
1. Update inventory page to use cache API
2. Migrate search functionality
3. Update vendor and low-stock queries
4. Add cache management UI

### Phase 3: Full Replacement
1. Remove old direct API calls
2. Update all inventory endpoints
3. Implement background cache warming
4. Add advanced monitoring

### Migration Commands

```bash
# Test cache service
npm run test:api -- --testNamePattern="cache"

# Compare performance
npm run test:performance:cache

# Migrate inventory page
# (Update inventory/page.tsx to use cache endpoints)
```

## 🚨 Error Handling & Recovery

### Automatic Fallbacks

1. **API Failure → Stale Cache**: Return cached data with warning
2. **Cache Failure → Direct API**: Bypass cache, fetch directly
3. **Complete Failure → Empty State**: Graceful degradation with user notification

### Manual Recovery

```typescript
// Clear corrupted cache
await finaleCacheService.clearCache();

// Force fresh data
const fresh = await finaleCacheService.getInventoryData({ 
  forceRefresh: true 
});

// Warm up cache for better performance
await finaleCacheService.warmUpCache();
```

## 📈 Performance Expectations

### Before (Direct API):
- **First Load**: 3-8 seconds
- **Subsequent Loads**: 3-8 seconds
- **Search Operations**: 2-5 seconds
- **Filter Operations**: 3-8 seconds

### After (Cache-First):
- **First Load**: 100-300ms (cached)
- **Cache Miss**: 3-8 seconds (same as before)
- **Search Operations**: 50-150ms
- **Filter Operations**: 50-150ms

### Expected Cache Hit Rates:
- **Normal Operations**: 85-95%
- **During Updates**: 70-85%
- **Peak Usage**: 90-98%

## 🔧 Advanced Features

### Predictive Caching
```typescript
// Pre-load frequently accessed data
await finaleCacheService.warmUpCache();

// Background refresh during low usage
setInterval(() => {
  finaleCacheService.getInventoryData({ forceRefresh: true });
}, 1000 * 60 * 10); // Every 10 minutes
```

### Selective Cache Invalidation
```typescript
// Clear specific data
await kv.del('inventory:vendor:BuildASoil');

// Pattern-based clearing
const keys = await kv.keys('inventory:*');
await kv.del(...keys);
```

### Cache Warming Strategies
```typescript
// Warm cache before peak hours
const warmUpSchedule = [
  { hour: 8, action: 'fullRefresh' },   // Morning prep
  { hour: 12, action: 'vendorRefresh' }, // Lunch update
  { hour: 16, action: 'lowStockCheck' }  // Afternoon review
];
```

## 🚀 Deployment Checklist

### Pre-deployment:
- [ ] Vercel KV database created
- [ ] Environment variables configured
- [ ] Finale API credentials tested
- [ ] Cache service health check passing
- [ ] Performance benchmarks established

### Deployment:
- [ ] Deploy cache service to staging
- [ ] Run integration tests
- [ ] Monitor cache hit rates
- [ ] Verify error handling
- [ ] Performance validation

### Post-deployment:
- [ ] Monitor cache performance
- [ ] Set up alerting for failures
- [ ] Document any issues
- [ ] Plan optimization iterations

## 🎯 Recommended Next Steps

1. **Deploy cache service** to staging environment
2. **Update inventory page** to use cache endpoints
3. **Add cache management UI** to settings
4. **Monitor performance** and optimize TTL settings
5. **Plan migration** of remaining inventory operations

This cache-first architecture provides the optimal balance of performance, simplicity, and cost-effectiveness for your Finale integration! 🚀
