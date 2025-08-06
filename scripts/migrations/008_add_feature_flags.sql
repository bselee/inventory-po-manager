-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('boolean', 'percentage', 'variant', 'user_list', 'environment')),
  status VARCHAR(50) NOT NULL DEFAULT 'disabled' CHECK (status IN ('enabled', 'disabled', 'partial')),
  value JSONB,
  rules JSONB,
  variants JSONB,
  rollout_percentage INTEGER CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  enabled_users TEXT[],
  enabled_environments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- Create indexes
CREATE INDEX idx_feature_flags_status ON feature_flags(status);
CREATE INDEX idx_feature_flags_type ON feature_flags(type);
CREATE INDEX idx_feature_flags_expires_at ON feature_flags(expires_at) WHERE expires_at IS NOT NULL;

-- Feature Flag Evaluations Table (for analytics)
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id SERIAL PRIMARY KEY,
  flag_id VARCHAR(255) REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  evaluated_value BOOLEAN,
  variant VARCHAR(255),
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for evaluations
CREATE INDEX idx_feature_flag_evaluations_flag_id ON feature_flag_evaluations(flag_id);
CREATE INDEX idx_feature_flag_evaluations_user_id ON feature_flag_evaluations(user_id);
CREATE INDEX idx_feature_flag_evaluations_created_at ON feature_flag_evaluations(created_at);

-- Feature Flag Overrides Table
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id SERIAL PRIMARY KEY,
  flag_id VARCHAR(255) REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  override_value JSONB NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  UNIQUE(flag_id, user_id)
);

-- Create indexes for overrides
CREATE INDEX idx_feature_flag_overrides_flag_id ON feature_flag_overrides(flag_id);
CREATE INDEX idx_feature_flag_overrides_user_id ON feature_flag_overrides(user_id);

-- Insert default feature flags
INSERT INTO feature_flags (id, name, description, type, status, value) VALUES
  ('enhanced_inventory_view', 'Enhanced Inventory View', 'New inventory table with advanced features', 'percentage', 'partial', '{"enabled": true}'),
  ('redis_caching', 'Redis Caching', 'Enable Redis caching for improved performance', 'environment', 'enabled', '{"enabled": true}'),
  ('ai_predictions', 'AI Predictions', 'Enable AI-powered demand predictions', 'user_list', 'disabled', '{"enabled": false}'),
  ('dark_mode', 'Dark Mode', 'Enable dark mode theme', 'boolean', 'enabled', '{"enabled": true}'),
  ('export_formats', 'Export Formats', 'Test different export format options', 'variant', 'enabled', '{"enabled": true}')
ON CONFLICT (id) DO NOTHING;

-- Update feature flags variants
UPDATE feature_flags 
SET variants = '[
  {"id": "1", "name": "csv_only", "value": ["csv"], "weight": 33, "isControl": true},
  {"id": "2", "name": "csv_excel", "value": ["csv", "xlsx"], "weight": 33},
  {"id": "3", "name": "all_formats", "value": ["csv", "xlsx", "pdf"], "weight": 34}
]'::jsonb
WHERE id = 'export_formats';

-- Update percentage rollout
UPDATE feature_flags 
SET rollout_percentage = 50
WHERE id = 'enhanced_inventory_view';

-- Update enabled environments
UPDATE feature_flags 
SET enabled_environments = ARRAY['production']
WHERE id = 'redis_caching';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at_trigger
BEFORE UPDATE ON feature_flags
FOR EACH ROW
EXECUTE FUNCTION update_feature_flags_updated_at();

-- Grant permissions (adjust as needed for your database user)
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_flags TO authenticated;
GRANT SELECT, INSERT ON feature_flag_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_flag_overrides TO authenticated;