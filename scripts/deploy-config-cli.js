#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DeploymentConfig = require('./deployment-config');

/**
 * Interactive CLI for deployment configuration
 */
class DeployConfigCLI {
  constructor() {
    this.config = new DeploymentConfig();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start the interactive CLI
   */
  async start() {
    console.log('🚀 Deployment Configuration Manager\n');
    
    while (true) {
      const choice = await this.showMainMenu();
      
      switch (choice) {
        case '1':
          await this.viewConfiguration();
          break;
        case '2':
          await this.toggleChecks();
          break;
        case '3':
          await this.configureTimeouts();
          break;
        case '4':
          await this.configureAutoFix();
          break;
        case '5':
          await this.configureTests();
          break;
        case '6':
          await this.quickSetup();
          break;
        case '7':
          await this.exportConfig();
          break;
        case '8':
          await this.resetConfig();
          break;
        case '0':
          console.log('Goodbye! 👋');
          this.rl.close();
          process.exit(0);
        default:
          console.log('Invalid choice. Please try again.\n');
      }
    }
  }

  /**
   * Show main menu
   */
  async showMainMenu() {
    console.log('\n=== Main Menu ===');
    console.log('1. View current configuration');
    console.log('2. Toggle checks (enable/disable)');
    console.log('3. Configure timeouts');
    console.log('4. Configure auto-fix');
    console.log('5. Configure tests');
    console.log('6. Quick setup profiles');
    console.log('7. Export configuration');
    console.log('8. Reset to defaults');
    console.log('0. Exit');
    
    return this.question('\nChoice: ');
  }

  /**
   * View current configuration
   */
  async viewConfiguration() {
    console.log('\n=== Current Configuration ===\n');
    
    // Show enabled checks
    console.log('Enabled Checks:');
    const checks = [
      'gitStatus', 'dependencies', 'typescript', 'linting', 
      'tests.unit', 'tests.integration', 'tests.e2e', 
      'build', 'security', 'healthChecks'
    ];
    
    checks.forEach(check => {
      const enabled = this.config.get(`checks.${check}.enabled`, false);
      const emoji = enabled ? '✅' : '❌';
      console.log(`  ${emoji} ${check}`);
    });
    
    // Show timeouts
    console.log('\nTimeouts:');
    const timeouts = ['buildTimeout', 'testTimeout', 'deploymentTimeout', 'healthCheckTimeout'];
    timeouts.forEach(timeout => {
      const value = this.config.get(`timeouts.${timeout}`, 60000);
      console.log(`  ${timeout}: ${value}ms (${value/1000}s)`);
    });
    
    // Show features
    console.log('\nFeatures:');
    const features = ['parallelChecks', 'incrementalBuilds', 'cacheOptimization', 'smartRetry', 'verboseLogging', 'dryRun'];
    features.forEach(feature => {
      const enabled = this.config.get(`features.${feature}`, false);
      const emoji = enabled ? '✅' : '❌';
      console.log(`  ${emoji} ${feature}`);
    });
    
    await this.pause();
  }

  /**
   * Toggle checks on/off
   */
  async toggleChecks() {
    console.log('\n=== Toggle Checks ===\n');
    
    const checks = [
      { key: 'gitStatus', name: 'Git Status Check' },
      { key: 'dependencies', name: 'Dependencies Check' },
      { key: 'typescript', name: 'TypeScript Check' },
      { key: 'linting', name: 'ESLint Check' },
      { key: 'tests.unit', name: 'Unit Tests' },
      { key: 'tests.integration', name: 'Integration Tests' },
      { key: 'tests.e2e', name: 'E2E Tests' },
      { key: 'build', name: 'Production Build' },
      { key: 'security', name: 'Security Scan' },
      { key: 'healthChecks', name: 'Health Checks' }
    ];
    
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      const enabled = this.config.get(`checks.${check.key}.enabled`, false);
      console.log(`${i + 1}. ${enabled ? '✅' : '❌'} ${check.name}`);
    }
    
    console.log('0. Back to main menu');
    
    const choice = await this.question('\nSelect check to toggle: ');
    
    if (choice === '0') return;
    
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < checks.length) {
      const check = checks[index];
      const currentValue = this.config.get(`checks.${check.key}.enabled`, false);
      this.config.set(`checks.${check.key}.enabled`, !currentValue);
      this.config.save();
      console.log(`\n${check.name} is now ${!currentValue ? 'enabled ✅' : 'disabled ❌'}`);
    }
    
    await this.pause();
  }

  /**
   * Configure timeouts
   */
  async configureTimeouts() {
    console.log('\n=== Configure Timeouts ===\n');
    
    const timeouts = [
      { key: 'buildTimeout', name: 'Build Timeout', default: 300000 },
      { key: 'testTimeout', name: 'Test Timeout', default: 120000 },
      { key: 'deploymentTimeout', name: 'Deployment Timeout', default: 600000 },
      { key: 'healthCheckTimeout', name: 'Health Check Timeout', default: 30000 },
      { key: 'apiTimeout', name: 'API Timeout', default: 10000 }
    ];
    
    for (const timeout of timeouts) {
      const current = this.config.get(`timeouts.${timeout.key}`, timeout.default);
      console.log(`${timeout.name}: ${current}ms (${current/1000}s)`);
      
      const newValue = await this.question(`New value in seconds (press Enter to keep current): `);
      
      if (newValue) {
        const ms = parseInt(newValue) * 1000;
        if (!isNaN(ms) && ms > 0) {
          this.config.set(`timeouts.${timeout.key}`, ms);
          console.log(`  Set to ${ms}ms (${ms/1000}s)`);
        }
      }
      console.log();
    }
    
    this.config.save();
    console.log('Timeouts updated!');
    await this.pause();
  }

  /**
   * Configure auto-fix settings
   */
  async configureAutoFix() {
    console.log('\n=== Configure Auto-Fix ===\n');
    
    const enabled = this.config.get('autoFix.enabled', true);
    console.log(`Auto-fix is currently: ${enabled ? 'enabled ✅' : 'disabled ❌'}`);
    
    const toggle = await this.question('Toggle auto-fix? (y/n): ');
    if (toggle.toLowerCase() === 'y') {
      this.config.set('autoFix.enabled', !enabled);
      console.log(`Auto-fix is now ${!enabled ? 'enabled ✅' : 'disabled ❌'}`);
    }
    
    if (this.config.get('autoFix.enabled')) {
      console.log('\nAuto-fix rules:');
      const rules = ['prettier', 'eslint', 'typescript', 'packageJson', 'lockFile'];
      
      for (const rule of rules) {
        const ruleEnabled = this.config.get(`autoFix.rules.${rule}`, true);
        console.log(`  ${ruleEnabled ? '✅' : '❌'} ${rule}`);
        
        const toggleRule = await this.question(`Toggle ${rule}? (y/n, Enter to skip): `);
        if (toggleRule.toLowerCase() === 'y') {
          this.config.set(`autoFix.rules.${rule}`, !ruleEnabled);
        }
      }
      
      const commitMsg = this.config.get('autoFix.commitMessage', 'fix: Auto-fix deployment issues');
      console.log(`\nCurrent commit message: "${commitMsg}"`);
      
      const newMsg = await this.question('New commit message (Enter to keep current): ');
      if (newMsg) {
        this.config.set('autoFix.commitMessage', newMsg);
      }
    }
    
    this.config.save();
    console.log('\nAuto-fix settings updated!');
    await this.pause();
  }

  /**
   * Configure test settings
   */
  async configureTests() {
    console.log('\n=== Configure Tests ===\n');
    
    // Unit tests
    console.log('Unit Tests:');
    const unitEnabled = this.config.get('checks.tests.unit.enabled', true);
    const unitRequired = this.config.get('checks.tests.unit.required', true);
    const coverage = this.config.get('checks.tests.unit.coverageThreshold', 70);
    
    console.log(`  Enabled: ${unitEnabled ? '✅' : '❌'}`);
    console.log(`  Required: ${unitRequired ? 'Yes' : 'No'}`);
    console.log(`  Coverage threshold: ${coverage}%`);
    
    const newCoverage = await this.question('New coverage threshold (0-100, Enter to skip): ');
    if (newCoverage) {
      const value = parseInt(newCoverage);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        this.config.set('checks.tests.unit.coverageThreshold', value);
      }
    }
    
    // E2E tests
    console.log('\nE2E Tests:');
    const e2eEnabled = this.config.get('checks.tests.e2e.enabled', false);
    console.log(`  Enabled: ${e2eEnabled ? '✅' : '❌'}`);
    
    const toggleE2E = await this.question('Toggle E2E tests? (y/n): ');
    if (toggleE2E.toLowerCase() === 'y') {
      this.config.set('checks.tests.e2e.enabled', !e2eEnabled);
    }
    
    this.config.save();
    console.log('\nTest settings updated!');
    await this.pause();
  }

  /**
   * Quick setup profiles
   */
  async quickSetup() {
    console.log('\n=== Quick Setup Profiles ===\n');
    console.log('1. Development (fast, minimal checks)');
    console.log('2. Staging (balanced checks)');
    console.log('3. Production (all checks enabled)');
    console.log('4. CI/CD (optimized for automation)');
    console.log('0. Cancel');
    
    const choice = await this.question('\nSelect profile: ');
    
    switch (choice) {
      case '1':
        this.applyDevelopmentProfile();
        break;
      case '2':
        this.applyStagingProfile();
        break;
      case '3':
        this.applyProductionProfile();
        break;
      case '4':
        this.applyCICDProfile();
        break;
      case '0':
        return;
    }
    
    this.config.save();
    console.log('Profile applied successfully!');
    await this.pause();
  }

  /**
   * Apply development profile
   */
  applyDevelopmentProfile() {
    console.log('Applying development profile...');
    
    this.config.set('deployment.environment', 'development');
    this.config.set('checks.gitStatus.enabled', false);
    this.config.set('checks.dependencies.enabled', false);
    this.config.set('checks.typescript.enabled', true);
    this.config.set('checks.linting.enabled', true);
    this.config.set('checks.tests.unit.enabled', true);
    this.config.set('checks.tests.unit.required', false);
    this.config.set('checks.tests.integration.enabled', false);
    this.config.set('checks.tests.e2e.enabled', false);
    this.config.set('checks.build.enabled', true);
    this.config.set('checks.security.enabled', false);
    this.config.set('checks.healthChecks.enabled', false);
    this.config.set('features.verboseLogging', true);
    this.config.set('autoFix.enabled', true);
  }

  /**
   * Apply staging profile
   */
  applyStagingProfile() {
    console.log('Applying staging profile...');
    
    this.config.set('deployment.environment', 'staging');
    this.config.set('checks.gitStatus.enabled', true);
    this.config.set('checks.dependencies.enabled', true);
    this.config.set('checks.typescript.enabled', true);
    this.config.set('checks.linting.enabled', true);
    this.config.set('checks.tests.unit.enabled', true);
    this.config.set('checks.tests.unit.required', true);
    this.config.set('checks.tests.integration.enabled', true);
    this.config.set('checks.tests.e2e.enabled', false);
    this.config.set('checks.build.enabled', true);
    this.config.set('checks.security.enabled', true);
    this.config.set('checks.healthChecks.enabled', true);
    this.config.set('features.verboseLogging', false);
    this.config.set('autoFix.enabled', true);
  }

  /**
   * Apply production profile
   */
  applyProductionProfile() {
    console.log('Applying production profile...');
    
    this.config.set('deployment.environment', 'production');
    this.config.set('checks.gitStatus.enabled', true);
    this.config.set('checks.dependencies.enabled', true);
    this.config.set('checks.typescript.enabled', true);
    this.config.set('checks.linting.enabled', true);
    this.config.set('checks.tests.unit.enabled', true);
    this.config.set('checks.tests.unit.required', true);
    this.config.set('checks.tests.integration.enabled', true);
    this.config.set('checks.tests.e2e.enabled', true);
    this.config.set('checks.build.enabled', true);
    this.config.set('checks.security.enabled', true);
    this.config.set('checks.healthChecks.enabled', true);
    this.config.set('features.verboseLogging', false);
    this.config.set('autoFix.enabled', false);
  }

  /**
   * Apply CI/CD profile
   */
  applyCICDProfile() {
    console.log('Applying CI/CD profile...');
    
    this.config.set('deployment.environment', 'production');
    this.config.set('checks.gitStatus.enabled', false);
    this.config.set('checks.dependencies.enabled', true);
    this.config.set('checks.typescript.enabled', true);
    this.config.set('checks.linting.enabled', true);
    this.config.set('checks.tests.unit.enabled', true);
    this.config.set('checks.tests.unit.required', true);
    this.config.set('checks.tests.unit.parallelJobs', 8);
    this.config.set('checks.tests.integration.enabled', true);
    this.config.set('checks.tests.e2e.enabled', true);
    this.config.set('checks.tests.e2e.headless', true);
    this.config.set('checks.build.enabled', true);
    this.config.set('checks.security.enabled', true);
    this.config.set('checks.healthChecks.enabled', false);
    this.config.set('features.parallelChecks', true);
    this.config.set('features.incrementalBuilds', true);
    this.config.set('features.cacheOptimization', true);
    this.config.set('features.verboseLogging', true);
    this.config.set('autoFix.enabled', false);
  }

  /**
   * Export configuration
   */
  async exportConfig() {
    console.log('\n=== Export Configuration ===\n');
    console.log('1. Export as JSON file');
    console.log('2. Export as environment variables');
    console.log('3. Export as shell script');
    console.log('0. Cancel');
    
    const choice = await this.question('\nChoice: ');
    
    switch (choice) {
      case '1':
        const jsonPath = path.join(process.cwd(), '.deployment', 'config.export.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.config.config, null, 2));
        console.log(`Configuration exported to: ${jsonPath}`);
        break;
        
      case '2':
        console.log('\n# Environment variables:');
        this.exportAsEnv(this.config.config, 'DEPLOY');
        break;
        
      case '3':
        const scriptPath = path.join(process.cwd(), '.deployment', 'config.sh');
        const script = this.generateShellScript();
        fs.writeFileSync(scriptPath, script);
        console.log(`Shell script exported to: ${scriptPath}`);
        break;
    }
    
    await this.pause();
  }

  /**
   * Export as environment variables
   */
  exportAsEnv(obj, prefix) {
    Object.entries(obj).forEach(([key, value]) => {
      const envKey = `${prefix}_${key.toUpperCase()}`;
      if (typeof value === 'object' && !Array.isArray(value)) {
        this.exportAsEnv(value, envKey);
      } else {
        console.log(`export ${envKey}='${JSON.stringify(value)}'`);
      }
    });
  }

  /**
   * Generate shell script
   */
  generateShellScript() {
    return `#!/bin/bash
# Deployment Configuration Script
# Generated on ${new Date().toISOString()}

# Deployment settings
export DEPLOYMENT_ENABLED="${this.config.get('deployment.enabled')}"
export DEPLOYMENT_ENV="${this.config.get('deployment.environment')}"
export RETRY_ATTEMPTS="${this.config.get('deployment.retryAttempts')}"

# Timeouts
export BUILD_TIMEOUT="${this.config.get('timeouts.buildTimeout')}"
export TEST_TIMEOUT="${this.config.get('timeouts.testTimeout')}"
export DEPLOY_TIMEOUT="${this.config.get('timeouts.deploymentTimeout')}"

# Checks
export CHECK_GIT="${this.config.get('checks.gitStatus.enabled')}"
export CHECK_DEPS="${this.config.get('checks.dependencies.enabled')}"
export CHECK_TS="${this.config.get('checks.typescript.enabled')}"
export CHECK_LINT="${this.config.get('checks.linting.enabled')}"
export CHECK_TESTS="${this.config.get('checks.tests.unit.enabled')}"
export CHECK_BUILD="${this.config.get('checks.build.enabled')}"
export CHECK_SECURITY="${this.config.get('checks.security.enabled')}"

# Features
export PARALLEL_CHECKS="${this.config.get('features.parallelChecks')}"
export VERBOSE_LOGGING="${this.config.get('features.verboseLogging')}"
export DRY_RUN="${this.config.get('features.dryRun')}"

echo "Configuration loaded successfully"
`;
  }

  /**
   * Reset configuration
   */
  async resetConfig() {
    console.log('\n⚠️  WARNING: This will reset all settings to defaults!');
    
    const confirm = await this.question('Are you sure? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
      this.config.config = this.config.getDefaults();
      this.config.save();
      console.log('Configuration reset to defaults!');
    } else {
      console.log('Reset cancelled.');
    }
    
    await this.pause();
  }

  /**
   * Helper: Ask question
   */
  question(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, resolve);
    });
  }

  /**
   * Helper: Pause for user
   */
  async pause() {
    await this.question('\nPress Enter to continue...');
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new DeployConfigCLI();
  cli.start().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = DeployConfigCLI;