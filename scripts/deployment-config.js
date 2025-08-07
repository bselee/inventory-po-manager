#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Deployment Configuration Manager
 * Provides configuration loading, validation, and default values
 */
class DeploymentConfig {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), '.deployment', 'config.json');
    this.config = this.loadConfig();
  }

  /**
   * Default configuration values
   */
  getDefaults() {
    return {
      deployment: {
        enabled: true,
        environment: 'production',
        retryAttempts: 3,
        retryDelay: 5000
      },
      timeouts: {
        buildTimeout: 300000,      // 5 minutes
        testTimeout: 120000,        // 2 minutes
        deploymentTimeout: 600000,  // 10 minutes
        healthCheckTimeout: 30000,  // 30 seconds
        apiTimeout: 10000           // 10 seconds
      },
      checks: {
        gitStatus: {
          enabled: true,
          allowUntracked: false,
          allowModified: false,
          exceptions: ['.deployment/*.log', '*.tmp']
        },
        dependencies: {
          enabled: true,
          checkOutdated: true,
          checkVulnerabilities: true,
          autoUpdate: false,
          allowedVulnerabilities: ['low']
        },
        typescript: {
          enabled: true,
          strict: true,
          autoFix: true,
          ignorePaths: ['node_modules/**', '.next/**']
        },
        linting: {
          enabled: true,
          autoFix: true,
          failOnWarning: false,
          ignorePaths: ['node_modules/**', '.next/**']
        },
        tests: {
          unit: {
            enabled: true,
            required: true,
            coverageThreshold: 70,
            parallelJobs: 4
          },
          integration: {
            enabled: true,
            required: false,
            timeout: 60000
          },
          e2e: {
            enabled: false,
            required: false,
            browsers: ['chromium'],
            headless: true
          }
        },
        build: {
          enabled: true,
          analyze: true,
          bundleSizeLimit: '5MB',
          optimizations: {
            minify: true,
            treeshake: true,
            splitChunks: true
          }
        },
        security: {
          enabled: true,
          scanDependencies: true,
          scanCode: true,
          blockHighSeverity: true,
          allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC']
        },
        healthChecks: {
          enabled: true,
          endpoints: [
            {
              name: 'API Health',
              url: '/api/health',
              expectedStatus: 200,
              timeout: 5000
            }
          ]
        }
      },
      autoFix: {
        enabled: true,
        rules: {
          prettier: true,
          eslint: true,
          typescript: true,
          packageJson: true,
          lockFile: true
        },
        commitMessage: 'fix: Auto-fix deployment issues',
        maxAttempts: 3
      },
      notifications: {
        enabled: false,
        channels: {
          console: true,
          file: true,
          slack: false,
          email: false
        },
        events: {
          deploymentStart: true,
          deploymentSuccess: true,
          deploymentFailure: true,
          testsFailure: true,
          buildFailure: true
        }
      },
      rollback: {
        enabled: true,
        automatic: false,
        maxVersions: 5,
        healthCheckFailures: 3
      },
      features: {
        parallelChecks: true,
        incrementalBuilds: true,
        cacheOptimization: true,
        smartRetry: true,
        verboseLogging: false,
        dryRun: false
      },
      customScripts: {
        preDeploy: [],
        postDeploy: [],
        onFailure: [],
        onSuccess: []
      }
    };
  }

  /**
   * Load configuration from file or use defaults
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(fileContent);
        return this.mergeWithDefaults(loadedConfig);
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${this.configPath}:`, error.message);
    }
    
    return this.getDefaults();
  }

  /**
   * Deep merge configuration with defaults
   */
  mergeWithDefaults(config) {
    const defaults = this.getDefaults();
    return this.deepMerge(defaults, config);
  }

  /**
   * Deep merge utility
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Get a specific configuration value
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set a specific configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature) {
    return this.get(`checks.${feature}.enabled`, false) || 
           this.get(`features.${feature}`, false);
  }

  /**
   * Get timeout value
   */
  getTimeout(name) {
    return this.get(`timeouts.${name}`, 60000);
  }

  /**
   * Save configuration to file
   */
  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      
      return true;
    } catch (error) {
      console.error('Error saving config:', error.message);
      return false;
    }
  }

  /**
   * Validate configuration against schema
   */
  validate() {
    const errors = [];
    
    // Basic validation rules
    if (this.get('deployment.retryAttempts') < 0) {
      errors.push('deployment.retryAttempts must be >= 0');
    }
    
    if (this.get('checks.tests.unit.coverageThreshold') > 100) {
      errors.push('checks.tests.unit.coverageThreshold must be <= 100');
    }
    
    if (this.get('timeouts.buildTimeout') < 60000) {
      errors.push('timeouts.buildTimeout must be >= 60000ms');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'production';
    const envOverrides = {};
    
    // Apply environment-specific overrides
    if (env === 'development') {
      envOverrides['checks.tests.e2e.enabled'] = false;
      envOverrides['features.verboseLogging'] = true;
      envOverrides['deployment.environment'] = 'development';
    } else if (env === 'staging') {
      envOverrides['deployment.environment'] = 'staging';
      envOverrides['checks.tests.e2e.enabled'] = true;
    }
    
    // Apply overrides
    Object.entries(envOverrides).forEach(([path, value]) => {
      this.set(path, value);
    });
    
    return this.config;
  }

  /**
   * Export configuration for use in other scripts
   */
  export() {
    return {
      config: this.config,
      get: this.get.bind(this),
      set: this.set.bind(this),
      isEnabled: this.isEnabled.bind(this),
      getTimeout: this.getTimeout.bind(this),
      validate: this.validate.bind(this)
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = new DeploymentConfig();
  
  switch (args[0]) {
    case 'get':
      if (args[1]) {
        console.log(JSON.stringify(config.get(args[1]), null, 2));
      } else {
        console.log(JSON.stringify(config.config, null, 2));
      }
      break;
      
    case 'set':
      if (args[1] && args[2]) {
        const value = args[2] === 'true' ? true : 
                     args[2] === 'false' ? false : 
                     isNaN(args[2]) ? args[2] : Number(args[2]);
        config.set(args[1], value);
        config.save();
        console.log(`Set ${args[1]} = ${value}`);
      } else {
        console.error('Usage: deployment-config set <path> <value>');
        process.exit(1);
      }
      break;
      
    case 'validate':
      const validation = config.validate();
      if (validation.valid) {
        console.log('Configuration is valid');
      } else {
        console.error('Configuration errors:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      break;
      
    case 'reset':
      config.config = config.getDefaults();
      config.save();
      console.log('Configuration reset to defaults');
      break;
      
    case 'enable':
      if (args[1]) {
        config.set(`checks.${args[1]}.enabled`, true);
        config.save();
        console.log(`Enabled ${args[1]}`);
      }
      break;
      
    case 'disable':
      if (args[1]) {
        config.set(`checks.${args[1]}.enabled`, false);
        config.save();
        console.log(`Disabled ${args[1]}`);
      }
      break;
      
    case 'export':
      // Export for use in shell scripts
      Object.entries(config.config).forEach(([key, value]) => {
        if (typeof value === 'object') {
          console.log(`export DEPLOY_${key.toUpperCase()}='${JSON.stringify(value)}'`);
        } else {
          console.log(`export DEPLOY_${key.toUpperCase()}='${value}'`);
        }
      });
      break;
      
    default:
      console.log(`
Deployment Configuration Manager

Usage:
  deployment-config get [path]           - Get configuration value
  deployment-config set <path> <value>   - Set configuration value
  deployment-config validate             - Validate configuration
  deployment-config reset                - Reset to defaults
  deployment-config enable <check>       - Enable a check
  deployment-config disable <check>      - Disable a check
  deployment-config export              - Export as shell variables

Examples:
  deployment-config get checks.tests.unit.enabled
  deployment-config set timeouts.buildTimeout 400000
  deployment-config disable e2e
  deployment-config enable security
      `);
  }
}

// Export for use as module
module.exports = DeploymentConfig;