# 🚀 Redis Cloud Setup Guide for Inventory Management

## 📋 Overview

This guide walks through setting up Redis Cloud and configuring your deployment with a Finale + Redis Cloud architecture for high-performance inventory caching.

## 🔧 Redis Cloud Setup

### 1. **Create Redis Cloud Database**

1. **Sign up for Redis Cloud**
   - Go to [Redis Cloud](https://redis.com/try-free/)
   - Create a free account (30MB free tier)
   - Or upgrade to paid plan for production use

2. **Create New Database**
   - Click "New Database" in your dashboard
   - Choose "Redis Stack" for enhanced features
   - Select region closest to your users
   - Name: `inventory-po-manager-cache`

3. **Get Connection Details**
   - After creation, go to database details
   - Copy the connection information:
     ```env
     REDIS_URL=redis://default:password@redis-server:port
     # OR separate components:
     REDIS_HOST=redis-server.com
     REDIS_PORT=12345
     REDIS_PASSWORD=your_password
     ```

### 2. **Environment Variables Setup**

#### **Production Environment Variables**

In your deployment platform (Vercel, Railway, etc.), add these environment variables:

```bash
# Redis Cloud (Primary Storage)
REDIS_URL=redis://default:password@redis-server:port
# OR separate components:
REDIS_HOST=redis-server.com
REDIS_PORT=12345
REDIS_PASSWORD=your_password

# Finale API Configuration
FINALE_API_KEY=your_finale_api_key
FINALE_API_SECRET=your_finale_api_secret
FINALE_ACCOUNT_PATH=your_account_path

# App Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min

# Optional: Email notifications
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

# Feature Flags
ENABLE_SUPABASE_FALLBACK=false  # Set to true during migration period
MIGRATION_MODE=false            # Set to true during data migration
```

#### **Development Environment Variables** (`.env.local`)

```bash
# Redis Cloud (same as production or separate dev instance)
REDIS_URL=redis://default:password@redis-dev-server:port

# Finale API (use test/dev credentials if available)
FINALE_API_KEY=your_dev_finale_api_key
FINALE_API_SECRET=your_dev_finale_api_secret
FINALE_ACCOUNT_PATH=your_dev_account_path

# Development settings
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_local_development_secret

# Migration helpers
MIGRATION_MODE=true
ENABLE_DEBUG_LOGGING=true
```

### 3. **Redis Cloud Setup**

#### **Redis Cloud Configuration**

Create a Redis Cloud account at [https://redis.com/try-free/](https://redis.com/try-free/) and set up your database.

**Get your connection details:**
- Host: `redis-xxxxx.c1.us-east-1-1.ec2.cloud.redislabs.com`
- Port: `12345`
- Password: `your_redis_password`

**Connection URL format:**
```
redis://default:password@host:port
```

#### **Install Redis Client Dependencies**

```bash
npm install redis ioredis
npm install --save-dev @types/redis
```

#### **Update Package.json Scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "redis:connect": "node -e \"const redis = require('redis'); const client = redis.createClient(process.env.REDIS_URL); client.connect().then(() => console.log('Connected to Redis')).catch(console.error);\"",
    "redis:health": "node scripts/redis-health-check.js",
    "redis:migrate": "node scripts/migrate-to-redis.js",
    "redis:clear": "node scripts/clear-redis-cache.js",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    
    "migrate:check": "node scripts/check-migration-status.js",
    "migrate:data": "node scripts/migrate-supabase-to-kv.js",
    "migrate:verify": "node scripts/verify-kv-migration.js",
    
    "kv:health": "node scripts/test-kv-connection.js",
    "kv:clear": "node scripts/clear-kv-cache.js",
    "kv:backup": "node scripts/backup-kv-data.js"
  }
}
```

## 🔄 Migration Process

### **Phase 1: Dual Mode Setup (Recommended)**

1. **Enable Both Systems**
   ```bash
   ENABLE_SUPABASE_FALLBACK=true
   MIGRATION_MODE=true
   ```

2. **Deploy with Both Active**
   - KV handles new data
   - Supabase provides fallback
   - Data sync between systems

3. **Test Thoroughly**
   - Verify all functionality works
   - Monitor error rates
   - Check performance metrics

### **Phase 2: Data Migration**

1. **Run Migration Scripts**
   ```bash
   npm run migrate:data
   npm run migrate:verify
   ```

2. **Validate Data Integrity**
   - Compare record counts
   - Verify data consistency
   - Test all user flows

### **Phase 3: Full Cutover**

1. **Disable Supabase**
   ```bash
   ENABLE_SUPABASE_FALLBACK=false
   MIGRATION_MODE=false
   ```

2. **Final Verification**
   ```bash
   npm run kv:health
   npm run migrate:check
   ```

## 🛠️ KV Database Schema

### **Key Structure Design**
```typescript
// Settings
app:settings                    -> Settings object

// Purchase Orders
purchase_orders:all             -> PurchaseOrder[]
purchase_order:${id}           -> PurchaseOrder
counters:purchase_orders       -> number

// Sync Logs
sync_logs:all                  -> SyncLog[]
sync_log:${id}                -> SyncLog
sync:status                    -> SyncStatus

// Vendors
vendors:all                    -> Vendor[]
vendor:${id}                  -> Vendor
vendor:${id}:stats            -> VendorStats

// User Data
user:${userId}                -> UserData
session:${sessionId}          -> UserSession
user:${userId}:preferences    -> UserPreferences

// Cache
finale:cache:${key}           -> CachedData
inventory:cached_data         -> InventoryItem[]

// Historical
historical:${type}:${date}    -> HistoricalData
```

### **TTL Strategy**
```typescript
const TTL = {
  SESSION: 7 * 24 * 60 * 60,     // 7 days
  CACHE: 15 * 60,                // 15 minutes  
  SYNC_LOG: 30 * 24 * 60 * 60,   // 30 days
  HISTORICAL: 365 * 24 * 60 * 60, // 1 year
  STATS: 60 * 60,                // 1 hour
  SETTINGS: 0,                   // No expiry
  PURCHASE_ORDERS: 0             // No expiry
}
```

## 📊 Monitoring & Alerts

### **KV Usage Monitoring**
```typescript
// Add to your monitoring dashboard
export const KV_METRICS = {
  storage_used: 'kv.storage.bytes',
  requests_per_minute: 'kv.requests.rate',
  latency_p95: 'kv.latency.p95',
  error_rate: 'kv.errors.rate'
}
```

### **Health Check Endpoints**
```typescript
// /api/health/kv
export async function GET() {
  const health = await kvStorage.healthCheck()
  return Response.json({
    service: 'kv',
    healthy: health.healthy,
    latency: health.latency,
    timestamp: new Date().toISOString()
  })
}
```

## 🔐 Security Configuration

### **KV Access Control**
- Vercel KV tokens are automatically scoped to your project
- No additional access control needed
- Tokens rotate automatically

### **API Security**
```typescript
// middleware.ts updates for KV
export function middleware(request: NextRequest) {
  // Add KV-specific security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Storage-Provider', 'vercel-kv')
  response.headers.set('X-Migration-Status', 'completed')
  
  return response
}
```

## 🎯 Performance Optimization

### **KV Best Practices**

1. **Batch Operations**
   ```typescript
   // Good: Batch multiple operations
   await Promise.all([
     kvStorage.set('key1', data1),
     kvStorage.set('key2', data2),
     kvStorage.set('key3', data3)
   ])
   ```

2. **Smart Caching**
   ```typescript
   // Use TTL strategically
   await kvStorage.set('frequently-accessed', data, { ttl: 300 })
   await kvStorage.set('rarely-accessed', data, { ttl: 3600 })
   ```

3. **Connection Pooling**
   ```typescript
   // KV handles connection pooling automatically
   // No manual connection management needed
   ```

## 📈 Cost Optimization

### **KV Pricing Awareness**
- **Vercel KV Hobby**: 30,000 commands/month free
- **Pro Plan**: $20/month for 500,000 commands
- **Enterprise**: Custom pricing

### **Usage Optimization**
```typescript
// Minimize KV operations
const batchOperations = async (items: any[]) => {
  // Batch updates instead of individual calls
  const BATCH_SIZE = 10
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    await processBatch(batch)
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

## 🚀 Deployment Checklist

### **Pre-Migration**
- [ ] KV database created in Vercel
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Migration scripts ready
- [ ] Backup of Supabase data created

### **During Migration**
- [ ] Deploy in dual mode
- [ ] Run data migration
- [ ] Verify data integrity
- [ ] Test all functionality
- [ ] Monitor error rates

### **Post-Migration**
- [ ] Disable Supabase fallback
- [ ] Remove Supabase dependencies
- [ ] Update monitoring dashboards
- [ ] Update documentation
- [ ] Clean up old environment variables

## 🆘 Troubleshooting

### **Common Issues**

1. **KV Connection Errors**
   ```bash
   # Test connection
   npm run kv:health
   
   # Check environment variables
   echo $KV_REST_API_URL
   echo $KV_REST_API_TOKEN
   ```

2. **Migration Data Loss**
   ```bash
   # Verify migration
   npm run migrate:verify
   
   # Compare record counts
   node scripts/compare-data-counts.js
   ```

3. **Performance Issues**
   ```bash
   # Check KV metrics
   node scripts/check-kv-performance.js
   
   # Optimize query patterns
   node scripts/analyze-kv-usage.js
   ```

This setup will give you a robust, scalable architecture that eliminates Supabase dependency while maintaining all functionality!
