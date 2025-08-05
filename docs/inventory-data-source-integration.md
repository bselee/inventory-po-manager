# 🔗 Inventory Data Source Integration Guide

## Overview

The inventory system now supports **three data sources** that work seamlessly together:

1. **Supabase** - Real-time database storage
2. **Vercel KV (Legacy)** - Original cache implementation 
3. **Finale Cache (Optimized)** - New cache-first architecture

## 🏗️ Architecture Comparison

| Feature | Supabase | Vercel KV (Legacy) | Finale Cache (Optimized) |
|---------|----------|-------------------|--------------------------|
| **Data Source** | PostgreSQL Database | Finale API + Redis | Finale Reporting API + Redis |
| **Response Time** | 200-500ms | 100-300ms | 100-300ms |
| **Data Freshness** | Real-time | 15 minutes | 15 minutes |
| **Vendor Data** | Limited | Limited | Complete (with suppliers) |
| **API Endpoint** | `/api/inventory` | `/api/inventory-kv` | `/api/inventory/cache` |
| **Management** | Database UI | `/api/inventory-cache` | `/api/inventory/cache` |
| **Best For** | Real-time updates | Stable environments | New deployments |

## 🚀 Choosing the Right Data Source

### **Supabase (Real-time)** 
✅ **Use When:**
- You need real-time inventory updates
- You have complex business logic in the database
- You want to store additional metadata
- You're already using Supabase for other features

❌ **Avoid When:**
- Response time is critical (>500ms)
- You need complete vendor/supplier information
- You want minimal infrastructure complexity

### **Vercel KV (Legacy Cache)**
✅ **Use When:**
- You have an existing system that works
- You want caching but don't need the latest optimizations
- Migration risk is a concern
- You're comfortable with the current feature set

❌ **Avoid When:**
- You need the latest performance optimizations
- You want comprehensive vendor data
- You need better error handling and monitoring

### **Finale Cache (Optimized)** 🌟 **Recommended**
✅ **Use When:**
- You want the best performance (100-300ms)
- You need complete vendor/supplier data
- You want built-in monitoring and health checks
- You're setting up a new system or can migrate easily
- You want the simplest architecture

❌ **Avoid When:**
- You need real-time updates (sub-minute freshness)
- You have custom database logic that can't be replicated

## ⚙️ Configuration

### Settings Page Integration

The settings page (`/settings`) now includes data source selection:

```typescript
// Three radio button options:
inventory_data_source: 'supabase' | 'vercel-kv' | 'finale-cache'
```

### Cache Management Buttons

When using cached data sources (`vercel-kv` or `finale-cache`), you get:

- **Refresh Cache** - Force fresh data from Finale
- **Cache Stats** - View cache health and metrics

### Environment Variables

Each data source requires different configuration:

#### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Vercel KV (Legacy)
```env
KV_URL=your-kv-url
FINALE_API_KEY=your-api-key
FINALE_API_SECRET=your-api-secret
FINALE_ACCOUNT_PATH=your-account-path
```

#### Finale Cache (Optimized)
```env
KV_URL=your-kv-url  # Vercel KV auto-configures this
FINALE_API_KEY=your-api-key
FINALE_API_SECRET=your-api-secret
FINALE_ACCOUNT_PATH=your-account-path
FINALE_REPORT_URL=your-report-url  # Optional: can be set in settings
```

## 🔄 Data Flow Architecture

### Supabase Flow
```
Request → Next.js API → Supabase Database → Response
```

### Vercel KV (Legacy) Flow  
```
Request → Check Redis → Cache Hit? → Return Data
                     ↓
                 Cache Miss → Finale API → Store in Redis → Return Data
```

### Finale Cache (Optimized) Flow
```
Request → Check Redis → Cache Hit? → Return Data
                     ↓
                 Cache Miss → Finale Reporting API → Transform → Store in Redis → Return Data
```

## 🔧 API Endpoint Mapping

The system automatically routes to the correct endpoint based on your settings:

```typescript
// useInventoryDataSource.ts
export function getInventoryEndpoint(dataSource: DataSource): string {
  switch (dataSource) {
    case 'vercel-kv':
      return '/api/inventory-kv'
    case 'finale-cache': 
      return '/api/inventory/cache'
    case 'supabase':
    default:
      return '/api/inventory'
  }
}
```

## 📊 Response Format Compatibility

All data sources return the same response format:

```typescript
interface InventoryResponse {
  success: boolean
  data: InventoryItem[]
  count: number
  source: 'supabase' | 'cache' | 'api'
  timestamp: string
  // Additional metadata may vary by source
}
```

## 🚀 Migration Strategies

### From Supabase → Finale Cache

1. **Setup**: Add Finale credentials to environment
2. **Test**: Change data source to `finale-cache` in settings
3. **Verify**: Check inventory loads correctly with cache buttons
4. **Monitor**: Watch performance and cache hit rates
5. **Rollback**: Switch back to `supabase` if needed

### From Vercel KV → Finale Cache

1. **Compare**: Test both systems side-by-side
2. **Features**: Verify new system has all needed features
3. **Performance**: Benchmark response times
4. **Switch**: Change data source to `finale-cache`
5. **Monitor**: Watch for any issues or missing data

### Zero-Downtime Migration

```typescript
// Example: Progressive rollout
const rolloutPercentage = 25; // Start with 25% of users
const useNewCache = Math.random() < (rolloutPercentage / 100);
const dataSource = useNewCache ? 'finale-cache' : 'vercel-kv';
```

## 🔍 Monitoring & Debugging

### Cache Health Monitoring

Each cache system provides health checks:

```bash
# Legacy KV Cache
curl -X POST "http://localhost:3000/api/inventory-cache" \
  -H "Content-Type: application/json" \
  -d '{"action": "healthCheck"}'

# New Finale Cache  
curl -X POST "http://localhost:3000/api/inventory/cache" \
  -H "Content-Type: application/json" \
  -d '{"action": "healthCheck"}'
```

### Performance Comparison

```typescript
// Benchmark different data sources
const benchmarkDataSources = async () => {
  const sources = ['supabase', 'vercel-kv', 'finale-cache']
  
  for (const source of sources) {
    const start = Date.now()
    const response = await fetch(getInventoryEndpoint(source))
    const duration = Date.now() - start
    console.log(`${source}: ${duration}ms`)
  }
}
```

### Debug Logging

Enable debug mode for detailed logging:

```env
DEBUG_CACHE_SERVICE=true
DEBUG_KV_SERVICE=true
```

## 🚨 Troubleshooting

### Common Issues

#### "Cache not refreshing"
- Check Finale API credentials
- Verify report URL is accessible
- Check cache TTL settings
- Try manual cache clear

#### "Data source not switching"
- Clear browser cache
- Check settings are saved to database
- Verify environment variables
- Restart development server

#### "Missing vendor data"
- Use `finale-cache` for complete supplier information
- Check Finale report includes supplier fields
- Verify report URL format

### Error Recovery

Each system includes automatic fallbacks:

1. **Cache Miss** → Try direct API call
2. **API Timeout** → Return stale cached data
3. **Complete Failure** → Return empty state with error message

## 📈 Performance Expectations

### Response Time Benchmarks

| Operation | Supabase | Vercel KV | Finale Cache |
|-----------|----------|-----------|--------------|
| Full inventory load | 200-500ms | 100-300ms | 100-300ms |
| Search/filter | 100-200ms | 50-150ms | 50-150ms |
| Cache refresh | N/A | 3-8s | 3-8s |
| Cache stats | N/A | 50-100ms | 50-100ms |

### Expected Cache Hit Rates

- **Normal Usage**: 85-95%
- **During Peak Hours**: 90-98%
- **After Cache Clear**: 0% initially, then builds up

## 🎯 Recommended Setup

### For New Deployments
1. **Primary**: `finale-cache` (optimized architecture)
2. **Fallback**: `supabase` (for real-time needs)
3. **Legacy**: `vercel-kv` (if migration needed)

### For Existing Systems
1. **Test**: `finale-cache` in development
2. **Compare**: Performance vs current system
3. **Migrate**: Gradually switch over
4. **Monitor**: Watch for issues

The integrated system provides maximum flexibility while maintaining compatibility across all approaches! 🚀
