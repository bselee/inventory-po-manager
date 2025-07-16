#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Vercel Deployment Script');
console.log('===========================\n');

// 1. Check if we have all required files
console.log('1. Checking project structure...');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'app/page.tsx'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
  }
}

// 2. Check dependencies
console.log('\n2. Checking dependencies...');
try {
  execSync('npm ls --depth=0', { stdio: 'pipe' });
  console.log('   ✅ Dependencies installed');
} catch (e) {
  console.log('   ⚠️  Dependency issues detected');
}

// 3. Test build locally
console.log('\n3. Testing build locally...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('   ✅ Build successful');
} catch (e) {
  console.log('   ❌ Build failed');
  console.log('   Error:', e.message);
  process.exit(1);
}

// 4. Check Git status
console.log('\n4. Checking Git status...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() === '') {
    console.log('   ✅ Git working directory clean');
  } else {
    console.log('   ⚠️  Uncommitted changes detected');
  }
  
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`   📋 Current branch: ${branch}`);
  
  const lastCommit = execSync('git log --oneline -1', { encoding: 'utf8' }).trim();
  console.log(`   💾 Last commit: ${lastCommit}`);
} catch (e) {
  console.log('   ❌ Git error:', e.message);
}

console.log('\n5. Deployment checklist:');
console.log('   📋 Ensure Vercel project is connected to GitHub');
console.log('   📋 Check environment variables are set in Vercel');
console.log('   📋 Verify database migrations are run');
console.log('   📋 Test with /api/verify-schema endpoint');

console.log('\n🎯 Next steps:');
console.log('   1. Go to Vercel Dashboard');
console.log('   2. Disconnect and reconnect GitHub');
console.log('   3. Ensure Production Branch is set to "master"');
console.log('   4. Trigger manual deployment');
console.log('   5. Check deployment logs for commit hash');

console.log('\n✅ Deployment preparation complete!');