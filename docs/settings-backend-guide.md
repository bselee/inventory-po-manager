# Settings Backend Implementation Guide

## Overview

The settings backend provides a robust, single-row configuration system with CSRF protection and comprehensive field validation. This guide documents the implementation details and best practices.

## Architecture

### Database Schema

The `settings` table enforces a single-row constraint to prevent configuration conflicts:

```sql
-- Key columns
id: UUID (primary key)
finale_api_key: string
finale_api_secret: string
finale_account_path: string
low_stock_threshold: integer
sync_enabled: boolean
-- ... and many more
```

### Single Row Enforcement

1. **Application Level**: Data access layer always uses `.order('created_at').limit(1)`
2. **Database Level**: Migration adds unique constraint and trigger (see migration 008)
3. **API Level**: Uses `upsert` pattern to handle both insert and update cases

## API Endpoints

### GET /api/settings

Retrieves current settings with transformed structure:

```javascript
{
  data: {
    settings: {
      finaleApi: {
        enabled: boolean,
        apiKey: '***',  // Masked for security
        apiSecret: '***',
        accountPath: string,
        lastSync: string | null
      },
      email: {
        enabled: boolean,
        alertEmail: string,
        sendgridApiKey: '***'
      },
      sync: {
        enabled: boolean,
        lowStockThreshold: number,
        inventory: boolean,
        vendors: boolean,
        purchaseOrders: boolean
      },
      general: {
        companyName: 'BuildASoil',
        timezone: 'America/Denver',
        currency: 'USD'
      }
    }
  }
}
```

### PUT /api/settings

Updates settings with automatic validation:

```javascript
// Request body
{
  finale_api_key: string,
  finale_api_secret: string,
  low_stock_threshold: number,
  sync_enabled: boolean,
  // ... other fields
}

// Response
{
  data: {
    settings: { /* updated settings object */ }
  },
  message: 'Settings updated successfully'
}
```

### POST /api/settings/test-finale

Tests Finale API connection using current settings.

## Frontend Integration

### Using the Client Fetch Utility

```typescript
import { api } from '@/app/lib/client-fetch'

// Load settings
const { data, error } = await api.get('/api/settings')

// Save settings (CSRF token included automatically)
const { data: result, error: saveError } = await api.put('/api/settings', {
  low_stock_threshold: 25,
  sync_enabled: true
})
```

### Settings Page Pattern

```typescript
// Load on mount
useEffect(() => {
  const initializePage = async () => {
    // Get CSRF token first
    await api.get('/api/auth/csrf')
    // Then load settings
    await loadSettings()
  }
  initializePage()
}, [])

// Save with error handling
const saveSettings = async () => {
  try {
    const { data: result, error } = await api.put('/api/settings', settingsData)
    if (error) throw new Error(error)
    setMessage({ type: 'success', text: 'Settings saved!' })
  } catch (error) {
    setMessage({ type: 'error', text: error.message })
  }
}
```

## Data Access Layer

### Key Functions

```typescript
import { getSettings, upsertSettings, updateSettings } from '@/app/lib/data-access'

// Get settings (returns null if none exist)
const settings = await getSettings()

// Create or update (handles both cases)
const updated = await upsertSettings({
  low_stock_threshold: 20,
  sync_enabled: true
})

// Update specific fields
const result = await updateSettings({
  sync_enabled: false
})
```

### Configuration Helpers

```typescript
// Get Finale configuration (checks env vars first)
const finaleConfig = await getFinaleConfig()
// Returns: { apiKey, apiSecret, accountPath } or null

// Get email configuration
const emailConfig = await getEmailConfig()
// Returns: { sendgridApiKey, alertEmail, fromEmail } or null

// Check if sync is enabled
const syncEnabled = await isSyncEnabled()
```

## Field Validation

The API uses Zod schemas for validation:

```typescript
// Email fields
alert_email: z.string().email().optional().nullable()
sendgrid_api_key: z.string().optional().nullable()

// Numeric fields
low_stock_threshold: z.number().min(0).optional()
sync_frequency_minutes: z.number().min(1).optional()

// Boolean fields
sync_enabled: z.boolean().optional()
sync_inventory: z.boolean().optional()
```

## Security Considerations

1. **CSRF Protection**: All mutations require valid CSRF token
2. **API Key Masking**: Sensitive fields return '***' in GET responses
3. **Environment Variables**: Can override database settings
4. **Single Row Constraint**: Prevents configuration conflicts

## Testing

### Backend Tests

```bash
# Test API endpoints and database operations
node scripts/test-settings-backend.js

# Test frontend integration
node scripts/test-settings-frontend.js

# Test specific save operation
node scripts/test-settings-save.js
```

### Manual Testing

1. Navigate to `/settings`
2. Modify any field
3. Click "Save Settings"
4. Verify success message
5. Refresh page to confirm persistence

## Common Issues

### Multiple Settings Rows

**Symptom**: Settings save but don't persist on reload

**Cause**: Multiple rows in settings table

**Fix**: Run cleanup script
```bash
node scripts/cleanup-settings-table.js
```

### Missing CSRF Token

**Symptom**: 403 error when saving

**Fix**: Ensure using `api` from client-fetch:
```typescript
import { api } from '@/app/lib/client-fetch'
// NOT raw fetch()
```

### Schema Mismatch

**Symptom**: 500 error mentioning unknown columns

**Fix**: Check actual database schema and remove non-existent fields from API

## Migration Guide

To apply the single-row constraint migration:

1. Generate migration SQL:
   ```bash
   node scripts/prepare-migration.js
   ```

2. Copy the SQL from `scripts/settings-migration-ready.sql`

3. Execute in Supabase SQL Editor

4. Verify with:
   ```sql
   SELECT COUNT(*) FROM settings;
   -- Should return 1
   ```

## Best Practices

1. **Always use upsert**: Handles both insert and update cases
2. **Validate early**: Use Zod schemas in API routes
3. **Test integrations**: Run frontend tests after backend changes
4. **Monitor single row**: Periodically check for duplicate rows
5. **Use type safety**: Import Settings interface from data-access

## Environment Variables

Settings can be configured via environment variables as fallback:

```env
FINALE_API_KEY=your-key
FINALE_API_SECRET=your-secret
FINALE_ACCOUNT_PATH=your-account
SENDGRID_API_KEY=your-sendgrid-key
```

Priority: Database settings > Environment variables