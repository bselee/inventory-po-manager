#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DeploymentConfig = require('./deployment-config');

/**
 * Auto-fix common build issues
 */
class BuildAutoFixer {
  constructor() {
    this.config = new DeploymentConfig();
    this.fixAttempts = 0;
    this.maxAttempts = this.config.get('autoFix.maxAttempts', 3);
    this.fixes = [];
  }

  /**
   * Main auto-fix routine
   */
  async run() {
    console.log('🔧 Starting auto-fix for build issues...\n');
    
    if (!this.config.get('autoFix.enabled', true)) {
      console.log('Auto-fix is disabled in configuration');
      return false;
    }

    const buildLogPath = path.join(process.cwd(), '.deployment', 'build.log');
    let buildErrors = '';
    
    try {
      if (fs.existsSync(buildLogPath)) {
        buildErrors = fs.readFileSync(buildLogPath, 'utf8');
      } else {
        // Try to get the last build output
        try {
          execSync('npm run build 2>&1', { encoding: 'utf8' });
        } catch (error) {
          buildErrors = error.stdout + error.stderr;
        }
      }
    } catch (error) {
      console.error('Could not read build errors:', error.message);
      return false;
    }

    // Apply fixes based on error patterns
    const fixApplied = this.applyFixes(buildErrors);
    
    if (fixApplied) {
      console.log(`\n✅ Applied ${this.fixes.length} fix(es)`);
      
      // Commit fixes if configured
      if (this.config.get('autoFix.commitMessage')) {
        this.commitFixes();
      }
      
      return true;
    } else {
      console.log('No auto-fixes could be applied');
      return false;
    }
  }

  /**
   * Apply fixes based on error patterns
   */
  applyFixes(errorLog) {
    let fixesApplied = false;

    // Fix 1: Missing dependencies
    if (errorLog.includes('Cannot find module') || errorLog.includes('Module not found')) {
      if (this.fixMissingDependencies(errorLog)) {
        fixesApplied = true;
      }
    }

    // Fix 2: TypeScript errors
    if (errorLog.includes('Type error') || errorLog.includes('TS')) {
      if (this.config.get('autoFix.rules.typescript', true)) {
        if (this.fixTypeScriptErrors(errorLog)) {
          fixesApplied = true;
        }
      }
    }

    // Fix 3: ESLint errors
    if (errorLog.includes('ESLint') || errorLog.includes('Parsing error')) {
      if (this.config.get('autoFix.rules.eslint', true)) {
        if (this.fixESLintErrors()) {
          fixesApplied = true;
        }
      }
    }

    // Fix 4: Prettier formatting
    if (errorLog.includes('prettier') || errorLog.includes('formatting')) {
      if (this.config.get('autoFix.rules.prettier', true)) {
        if (this.fixPrettierErrors()) {
          fixesApplied = true;
        }
      }
    }

    // Fix 5: Package.json issues
    if (errorLog.includes('package.json') || errorLog.includes('npm ERR')) {
      if (this.config.get('autoFix.rules.packageJson', true)) {
        if (this.fixPackageJsonIssues()) {
          fixesApplied = true;
        }
      }
    }

    // Fix 6: Lock file issues
    if (errorLog.includes('lockfile') || errorLog.includes('package-lock')) {
      if (this.config.get('autoFix.rules.lockFile', true)) {
        if (this.fixLockFileIssues()) {
          fixesApplied = true;
        }
      }
    }

    // Fix 7: Import path issues
    if (errorLog.includes('import') || errorLog.includes('require')) {
      if (this.fixImportPaths(errorLog)) {
        fixesApplied = true;
      }
    }

    // Fix 8: Environment variable issues
    if (errorLog.includes('process.env') || errorLog.includes('undefined')) {
      if (this.fixEnvironmentVariables(errorLog)) {
        fixesApplied = true;
      }
    }

    return fixesApplied;
  }

  /**
   * Fix missing dependencies
   */
  fixMissingDependencies(errorLog) {
    console.log('🔍 Checking for missing dependencies...');
    
    const missingModules = new Set();
    const moduleRegex = /Cannot find module '([^']+)'/g;
    let match;
    
    while ((match = moduleRegex.exec(errorLog)) !== null) {
      const moduleName = match[1];
      if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
        missingModules.add(moduleName.split('/')[0]);
      }
    }
    
    if (missingModules.size > 0) {
      console.log(`Found ${missingModules.size} missing dependencies`);
      
      missingModules.forEach(module => {
        console.log(`  Installing ${module}...`);
        try {
          execSync(`npm install ${module}`, { stdio: 'inherit' });
          this.fixes.push(`Installed missing dependency: ${module}`);
        } catch (error) {
          console.error(`  Failed to install ${module}`);
        }
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Fix TypeScript errors
   */
  fixTypeScriptErrors(errorLog) {
    console.log('🔍 Fixing TypeScript errors...');
    
    try {
      // Try to auto-fix with TypeScript compiler
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      
      // Add any type definitions that might be missing
      if (errorLog.includes('@types/')) {
        const typeRegex = /@types\/([^\s'"]+)/g;
        let match;
        
        while ((match = typeRegex.exec(errorLog)) !== null) {
          const typePkg = `@types/${match[1]}`;
          console.log(`  Installing ${typePkg}...`);
          try {
            execSync(`npm install -D ${typePkg}`, { stdio: 'inherit' });
            this.fixes.push(`Installed type definitions: ${typePkg}`);
          } catch (error) {
            console.error(`  Failed to install ${typePkg}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix ESLint errors
   */
  fixESLintErrors() {
    console.log('🔍 Fixing ESLint errors...');
    
    try {
      execSync('npm run lint -- --fix', { stdio: 'inherit' });
      this.fixes.push('Fixed ESLint errors');
      return true;
    } catch (error) {
      console.error('Could not auto-fix all ESLint errors');
      return false;
    }
  }

  /**
   * Fix Prettier formatting
   */
  fixPrettierErrors() {
    console.log('🔍 Fixing Prettier formatting...');
    
    try {
      execSync('npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"', { stdio: 'inherit' });
      this.fixes.push('Fixed Prettier formatting');
      return true;
    } catch (error) {
      console.error('Could not auto-fix Prettier formatting');
      return false;
    }
  }

  /**
   * Fix package.json issues
   */
  fixPackageJsonIssues() {
    console.log('🔍 Fixing package.json issues...');
    
    try {
      // Ensure package.json is valid JSON
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Fix common issues
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      // Ensure required scripts exist
      const requiredScripts = ['build', 'dev', 'start', 'lint', 'test'];
      requiredScripts.forEach(script => {
        if (!packageJson.scripts[script]) {
          console.log(`  Adding missing script: ${script}`);
          packageJson.scripts[script] = script === 'build' ? 'next build' :
                                       script === 'dev' ? 'next dev' :
                                       script === 'start' ? 'next start' :
                                       script === 'lint' ? 'next lint' :
                                       'jest';
        }
      });
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.fixes.push('Fixed package.json structure');
      return true;
    } catch (error) {
      console.error('Could not fix package.json:', error.message);
      return false;
    }
  }

  /**
   * Fix lock file issues
   */
  fixLockFileIssues() {
    console.log('🔍 Fixing lock file issues...');
    
    try {
      // Remove and regenerate lock file
      const lockPath = path.join(process.cwd(), 'package-lock.json');
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
      
      execSync('npm install', { stdio: 'inherit' });
      this.fixes.push('Regenerated package-lock.json');
      return true;
    } catch (error) {
      console.error('Could not fix lock file');
      return false;
    }
  }

  /**
   * Fix import path issues
   */
  fixImportPaths(errorLog) {
    console.log('🔍 Fixing import path issues...');
    
    // Extract file paths with import errors
    const fileRegex = /([^\s]+\.(ts|tsx|js|jsx)):/g;
    const files = new Set();
    let match;
    
    while ((match = fileRegex.exec(errorLog)) !== null) {
      files.add(match[1]);
    }
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Fix relative imports
        content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/(.+)['"]/g, (match, path) => {
          modified = true;
          return `from '@/${path}'`;
        });
        
        // Fix missing file extensions
        content = content.replace(/from ['"](\.[^'"]+)(?<!\.tsx?)(?<!\.jsx?)['"]/g, (match, path) => {
          if (fs.existsSync(path + '.ts') || fs.existsSync(path + '.tsx')) {
            modified = true;
            return `from '${path}'`;
          }
          return match;
        });
        
        if (modified) {
          fs.writeFileSync(file, content);
          this.fixes.push(`Fixed import paths in ${file}`);
        }
      }
    });
    
    return files.size > 0;
  }

  /**
   * Fix environment variable issues
   */
  fixEnvironmentVariables(errorLog) {
    console.log('🔍 Checking environment variables...');
    
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envExamplePath) && !fs.existsSync(envLocalPath)) {
      console.log('  Creating .env.local from .env.example...');
      fs.copyFileSync(envExamplePath, envLocalPath);
      this.fixes.push('Created .env.local from template');
      return true;
    }
    
    return false;
  }

  /**
   * Commit fixes if configured
   */
  commitFixes() {
    const commitMessage = this.config.get('autoFix.commitMessage', 'fix: Auto-fix deployment issues');
    
    try {
      execSync('git add -A', { stdio: 'pipe' });
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
      console.log('\n📝 Committed fixes to git');
    } catch (error) {
      console.log('\n⚠️  Could not commit fixes (no changes or already committed)');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new BuildAutoFixer();
  fixer.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = BuildAutoFixer;