#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
// 1. Check if we have all required files
const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'app/page.tsx'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
  } else {
  }
}

// 2. Check dependencies
try {
  execSync('npm ls --depth=0', { stdio: 'pipe' });
} catch (e) {
}

// 3. Test build locally
try {
  execSync('npm run build', { stdio: 'pipe' });
} catch (e) {
  process.exit(1);
}

// 4. Check Git status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() === '') {
  } else {
  }
  
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  const lastCommit = execSync('git log --oneline -1', { encoding: 'utf8' }).trim();
} catch (e) {
}