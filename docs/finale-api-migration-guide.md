# Finale API Migration Guide

## Overview

This guide explains the migration from multiple Finale API implementations to the new consolidated `finale-api-consolidated.ts` service.

## Current State

The codebase has three Finale API implementations:
1. **finale-api.ts** - Main implementation (currently used in production)
2. **finale-api-optimized.ts** - Extends main with sync strategies
3. **finale-session-api.ts** - Alternative session-based authentication

## Migration Strategy

### Phase 1: Introduce Consolidated API (Completed)
- ✅ Created `finale-api-consolidated.ts` that unifies all implementations
- ✅ Maintains backward compatibility with existing code
- ✅ No breaking changes to current functionality

### Phase 2: Gradual Migration (Recommended Approach)

1. **Update imports in new code**:
   ```typescript
   // Old
   import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
   
   // New
   import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api-consolidated'
   ```

2. **Use unified service for new features**:
   ```typescript
   import { createFinaleApiService } from '@/app/lib/finale-api-consolidated'
   
   const finaleService = await createFinaleApiService()
   if (finaleService) {
     // Automatically uses the best available authentication method
     await finaleService.testConnection()
   }
   ```

3. **Leverage sync strategies**:
   ```typescript
   // Only available with API key auth
   if (finaleService.isApiKeyAuth()) {
     await finaleService.syncWithStrategy({
       strategy: 'critical',  // Only sync critical items
       activeOnly: true
     })
   }
   ```

### Phase 3: Update Existing Code

Update these key files gradually:
- `/app/api/sync-finale/route.ts` - Main sync endpoint
- `/app/api/inventory/sync/route.ts` - Inventory sync
- `/app/lib/sync-service.ts` - Sync orchestration

### Phase 4: Cleanup (After Testing)

Once all code is migrated and tested:
1. Update all imports to use consolidated API
2. Mark old implementations as deprecated
3. Eventually remove old implementations

## Benefits of Migration

1. **Single source of truth** - One API to maintain
2. **Flexible authentication** - Supports both API key and session auth
3. **Advanced sync strategies** - Optimize sync performance
4. **Better error handling** - Unified error handling across all methods
5. **Easier testing** - Mock a single service interface

## Backward Compatibility

The consolidated API maintains 100% backward compatibility:
- All existing methods work identically
- No changes to function signatures
- Existing `getFinaleConfig()` function preserved
- `FinaleApiService` class still exported

## Testing Checklist

Before completing migration:
- [ ] Test inventory sync with consolidated API
- [ ] Test purchase order creation
- [ ] Test vendor sync
- [ ] Verify sync strategies work correctly
- [ ] Test session-based auth (if needed)
- [ ] Verify error handling
- [ ] Check performance is maintained

## Rollback Plan

If issues arise:
1. Simply revert imports back to original files
2. No database or configuration changes needed
3. All original files remain intact during migration