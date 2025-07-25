-- Migration 004: Add authentication tables
-- Created: 2025-01-24
-- Description: Adds user authentication and authorization tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')) DEFAULT 'viewer',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create auth_sessions table for session management
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create auth_audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'login_failed', 'password_changed', 'permissions_changed', 'account_locked', 'account_unlocked')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (auth.uid()::TEXT = id::TEXT);

-- Policy: Admins can read all users
CREATE POLICY users_admin_read_all ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::TEXT = auth.uid()::TEXT 
      AND role = 'admin'
    )
  );

-- Policy: Users can update their own data (except role and permissions)
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid()::TEXT = id::TEXT)
  WITH CHECK (auth.uid()::TEXT = id::TEXT);

-- Add RLS policies for auth_sessions table
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY sessions_read_own ON auth_sessions
  FOR SELECT
  USING (user_id::TEXT = auth.uid()::TEXT);

-- Add RLS policies for auth_audit_logs table
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own audit logs
CREATE POLICY audit_logs_read_own ON auth_audit_logs
  FOR SELECT
  USING (user_id::TEXT = auth.uid()::TEXT);

-- Policy: Admins can see all audit logs
CREATE POLICY audit_logs_admin_read_all ON auth_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::TEXT = auth.uid()::TEXT 
      AND role = 'admin'
    )
  );

-- Create default admin user (password: ChangeMe123!)
-- Note: Change this password immediately after deployment
INSERT INTO users (email, password_hash, role, permissions)
VALUES (
  'admin@buildasoil.com',
  '$2b$10$tQquJe0840MShHkQceGMN.N7XGhcHmsYnI.tN0K7H1u1sX6ZmFeYO', -- Password: ChangeMe123!
  'admin',
  ARRAY[
    'inventory:read', 'inventory:write', 'inventory:delete',
    'purchase_orders:read', 'purchase_orders:write', 'purchase_orders:delete',
    'vendors:read', 'vendors:write', 'vendors:delete',
    'settings:read', 'settings:write',
    'sync:execute', 'sync:monitor',
    'users:read', 'users:write', 'users:delete',
    'admin:access'
  ]
) ON CONFLICT (email) DO NOTHING;

-- Add user_id column to existing tables for audit trail
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id);

-- Create view for active sessions with user info
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  s.id,
  s.user_id,
  u.email,
  u.role,
  s.expires_at,
  s.created_at,
  s.ip_address,
  s.user_agent
FROM auth_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
  AND s.expires_at > CURRENT_TIMESTAMP;

-- Grant permissions to authenticated users
GRANT SELECT ON active_sessions TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON auth_sessions TO authenticated;
GRANT ALL ON auth_audit_logs TO authenticated;