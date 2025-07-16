#!/usr/bin/env node

console.log('🔍 Environment Variables Validation');
console.log('====================================\n');

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

console.log('📋 Required Environment Variables:');
let missingRequired = 0;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar}: Set`);
  } else {
    console.log(`   ❌ ${envVar}: Missing`);
    missingRequired++;
  }
}

console.log('\n📋 Optional Environment Variables:');
let missingOptional = 0;
for (const envVar of optionalEnvVars) {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar}: Set`);
  } else {
    console.log(`   ⚠️  ${envVar}: Not set`);
    missingOptional++;
  }
}

console.log('\n📊 Summary:');
console.log(`   Required: ${requiredEnvVars.length - missingRequired}/${requiredEnvVars.length} set`);
console.log(`   Optional: ${optionalEnvVars.length - missingOptional}/${optionalEnvVars.length} set`);

if (missingRequired > 0) {
  console.log('\n❌ Missing required environment variables!');
  console.log('   Add these to your Vercel project settings:');
  console.log('   1. Go to Vercel Dashboard → Project Settings → Environment Variables');
  console.log('   2. Add the missing variables');
  console.log('   3. Redeploy the application');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}

console.log('\n🎯 Next steps for production deployment:');
console.log('   1. Ensure these variables are set in Vercel Dashboard');
console.log('   2. Set NODE_ENV=production in Vercel');
console.log('   3. Run database migrations in Supabase');
console.log('   4. Test the /api/verify-schema endpoint after deployment');