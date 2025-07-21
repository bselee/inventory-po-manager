-- Fix sync_logs table to ensure it has the correct columns
-- This handles different migration states

-- First, check if synced_at column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sync_logs' 
                   AND column_name = 'synced_at') THEN
        -- If created_at exists, rename it to synced_at
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sync_logs' 
                   AND column_name = 'created_at') THEN
            ALTER TABLE sync_logs RENAME COLUMN created_at TO synced_at;
        ELSE
            -- Neither exists, add synced_at
            ALTER TABLE sync_logs ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Add missing columns that our new sync system expects
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS items_processed INTEGER DEFAULT 0;
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS items_updated INTEGER DEFAULT 0;
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS errors TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure we have the status column with the right constraints
DO $$ 
BEGIN
    -- Check if status column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sync_logs' 
                   AND column_name = 'status') THEN
        ALTER TABLE sync_logs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'success';
    END IF;
    
    -- Drop any existing constraint
    ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_status_check;
    
    -- Add the new constraint that includes 'running'
    ALTER TABLE sync_logs ADD CONSTRAINT sync_logs_status_check 
        CHECK (status IN ('success', 'error', 'running', 'partial'));
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type_status_synced 
ON sync_logs(sync_type, status, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at 
ON sync_logs(synced_at DESC);

-- Migrate old column names if they exist
UPDATE sync_logs 
SET items_processed = COALESCE(records_processed, items_processed, 0)
WHERE items_processed IS NULL AND records_processed IS NOT NULL;

UPDATE sync_logs 
SET items_updated = COALESCE(records_updated, items_updated, 0)
WHERE items_updated IS NULL AND records_updated IS NOT NULL;