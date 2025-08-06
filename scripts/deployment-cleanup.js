#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
// 1. Clean build artifacts
try {
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'pipe' });
  }
  
  if (fs.existsSync('node_modules/.cache')) {
    execSync('rm -rf node_modules/.cache', { stdio: 'pipe' });
  }
} catch (e) {
}

// 2. Verify package.json integrity
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for required dependencies
  const requiredDeps = ['next', 'react', 'react-dom', '@supabase/supabase-js', 'xlsx'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
  
  if (missingDeps.length === 0) {
  } else {
    console.log('   ❌ Missing dependencies:', missingDeps.join(', '));
  }
  
  // Check scripts
  const requiredScripts = ['build', 'start', 'dev'];
  const missingScripts = requiredScripts.filter(script => !pkg.scripts[script]);
  
  if (missingScripts.length === 0) {
  } else {
    console.log('   ❌ Missing scripts:', missingScripts.join(', '));
  }
} catch (e) {
}

// 3. Test build
try {
  execSync('npm run build', { stdio: 'pipe' });
} catch (e) {
  console.log('   Error details:', e.stdout?.toString() || e.message);
}

// 4. Check TypeScript configuration
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (tsconfig.compilerOptions?.paths) {
    }
    if (tsconfig.compilerOptions?.strict) {
    }
  } catch (e) {
  }
} else {
}

// 5. Git status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() === '') {
  } else {
  }
} catch (e) {
}