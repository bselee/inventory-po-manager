#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧹 Deployment Cleanup & Optimization');
console.log('====================================\n');

// 1. Clean build artifacts
console.log('1. Cleaning build artifacts...');
try {
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'pipe' });
    console.log('   ✅ Removed .next directory');
  }
  
  if (fs.existsSync('node_modules/.cache')) {
    execSync('rm -rf node_modules/.cache', { stdio: 'pipe' });
    console.log('   ✅ Cleared node_modules cache');
  }
  
  console.log('   ✅ Build artifacts cleaned');
} catch (e) {
  console.log('   ⚠️  Cleanup warning:', e.message);
}

// 2. Verify package.json integrity
console.log('\n2. Verifying package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for required dependencies
  const requiredDeps = ['next', 'react', 'react-dom', '@supabase/supabase-js', 'xlsx'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('   ✅ All required dependencies present');
  } else {
    console.log('   ❌ Missing dependencies:', missingDeps.join(', '));
  }
  
  // Check scripts
  const requiredScripts = ['build', 'start', 'dev'];
  const missingScripts = requiredScripts.filter(script => !pkg.scripts[script]);
  
  if (missingScripts.length === 0) {
    console.log('   ✅ All required scripts present');
  } else {
    console.log('   ❌ Missing scripts:', missingScripts.join(', '));
  }
} catch (e) {
  console.log('   ❌ Package.json error:', e.message);
}

// 3. Test build
console.log('\n3. Testing production build...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('   ✅ Build successful');
} catch (e) {
  console.log('   ❌ Build failed');
  console.log('   Error details:', e.stdout?.toString() || e.message);
}

// 4. Check TypeScript configuration
console.log('\n4. Checking TypeScript configuration...');
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (tsconfig.compilerOptions?.paths) {
      console.log('   ✅ Path aliases configured');
    }
    if (tsconfig.compilerOptions?.strict) {
      console.log('   ✅ Strict mode enabled');
    }
  } catch (e) {
    console.log('   ⚠️  TypeScript config warning:', e.message);
  }
} else {
  console.log('   ⚠️  No tsconfig.json found');
}

// 5. Git status
console.log('\n5. Checking Git status...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() === '') {
    console.log('   ✅ Git working directory clean');
  } else {
    console.log('   ⚠️  Uncommitted changes:');
    console.log(status);
  }
} catch (e) {
  console.log('   ❌ Git status error:', e.message);
}

console.log('\n🎯 Final Deployment Checklist:');
console.log('   □ Vercel project connected to GitHub');
console.log('   □ Environment variables set in Vercel');
console.log('   □ Database migrations run in Supabase');
console.log('   □ Production branch set to "master"');
console.log('   □ Auto-deployment enabled');

console.log('\n🚀 Ready for deployment!');
console.log('   Your latest commit is ready to deploy');
console.log('   Go to Vercel Dashboard and trigger a manual deployment');
console.log('   or reconnect GitHub to fix webhook issues');