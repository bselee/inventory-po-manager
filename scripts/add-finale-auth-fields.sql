-- Add username/password fields for alternative Finale authentication
-- Run this migration in your Supabase SQL editor

-- Add the new columns to the settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS finale_username TEXT,
ADD COLUMN IF NOT EXISTS finale_password TEXT;

-- Add comments for documentation
COMMENT ON COLUMN settings.finale_username IS 'Finale username for session-based authentication (alternative to API key)';
COMMENT ON COLUMN settings.finale_password IS 'Finale password for session-based authentication (alternative to API key)';

-- The settings table should now support both authentication methods:
-- 1. API Key authentication (finale_api_key + finale_api_secret)
-- 2. Session authentication (finale_username + finale_password)
-- Both methods require finale_account_path