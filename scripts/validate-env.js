#!/usr/bin/env node
// Required environment variables for this project
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

// Optional but recommended
const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'FINALE_API_KEY',
  'FINALE_API_SECRET',
  'FINALE_ACCOUNT_PATH',
  'SENDGRID_API_KEY',
  'GOOGLE_SHEETS_API_KEY'
];
let missingRequired = 0;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
  } else {
    missingRequired++;
  }
}
let missingOptional = 0;
for (const envVar of optionalEnvVars) {
  if (process.env[envVar]) {
  } else {
    missingOptional++;
  }
}
if (missingRequired > 0) {
  process.exit(1);
} else {
}