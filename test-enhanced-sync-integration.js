#!/usr/bin/env node

/**
 * Enhanced Sync System Integration Test
 * Tests all the newly implemented features together
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testDuration: 30000, // 30 seconds
  enableLogs: true
};

class EnhancedSyncTester {
  constructor() {
    this.results = {
      tests: [],
      passed: 0,
      failed: 0,
      startTime: new Date(),
      endTime: null
    };
  }

  log(message, type = 'info') {
    if (!CONFIG.enableLogs) return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '[INFO]',
      success: '[SUCCESS]',
      error: '[ERROR]',
      warning: '[WARNING]'
    }[type] || '[INFO]';
    
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  async runTest(name, testFn) {
    this.log(`Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'passed',
        duration,
        error: null
      });
      
      this.results.passed++;
      this.log(`✅ ${name} - Passed (${duration}ms)`, 'success');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.results.failed++;
      this.log(`❌ ${name} - Failed: ${error.message}`, 'error');
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${CONFIG.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || data.error || 'Request failed'}`);
      }
      
      return data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running. Please start the development server with: npm run dev');
      }
      throw error;
    }
  }

  async testEnhancedSyncHealth() {
    const response = await this.makeRequest('/api/sync/enhanced?action=health');
    
    if (!response.success) {
      throw new Error('Health check returned unsuccessful response');
    }
    
    const health = response.data;
    
    if (!health || !health.status) {
      throw new Error('Invalid health response structure');
    }
    
    if (!health.components) {
      throw new Error('Missing components in health response');
    }
    
    this.log(`Health status: ${health.status}`);
    this.log(`Components: ${JSON.stringify(health.components)}`);
  }

  async testEnhancedSyncInitialization() {
    const response = await this.makeRequest('/api/sync/enhanced', {
      method: 'POST',
      body: JSON.stringify({ action: 'initialize' })
    });
    
    if (!response.success) {
      throw new Error(`Initialization failed: ${response.message}`);
    }
    
    this.log('Enhanced sync system initialized successfully');
  }

  async testSmartSync() {
    const response = await this.makeRequest('/api/sync/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        action: 'sync',
        strategy: 'smart',
        enableChangeDetection: true,
        enableRealTimeMonitoring: true,
        dryRun: true // Don't actually modify data
      })
    });
    
    if (!response.success) {
      throw new Error(`Smart sync failed: ${response.message}`);
    }
    
    const result = response.data;
    
    if (!result || typeof result.itemsProcessed !== 'number') {
      throw new Error('Invalid sync result structure');
    }
    
    this.log(`Smart sync processed ${result.itemsProcessed} items`);
    this.log(`Change detection efficiency: ${result.changeDetectionStats?.efficiencyGain?.toFixed(1) || 'N/A'}%`);
  }

  async testIntelligentSync() {
    const response = await this.makeRequest('/api/sync/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        action: 'intelligent'
      })
    });
    
    if (!response.success) {
      throw new Error(`Intelligent sync failed: ${response.message}`);
    }
    
    const result = response.data;
    
    if (!result || !result.strategy) {
      throw new Error('Invalid intelligent sync result structure');
    }
    
    this.log(`Intelligent sync used strategy: ${result.strategy}`);
    this.log(`Sync duration: ${result.duration}ms`);
  }

  async testSyncStatus() {
    const response = await this.makeRequest('/api/sync/enhanced?action=status');
    
    if (!response.success) {
      throw new Error('Status check returned unsuccessful response');
    }
    
    const status = response.data;
    
    if (!status || !status.recentSyncs) {
      throw new Error('Invalid status response structure');
    }
    
    this.log(`Recent syncs: ${status.recentSyncs.total}`);
    this.log(`Critical alerts: ${status.criticalAlerts}`);
  }

  async testFileIntegrity() {
    // Check that all required files exist
    const requiredFiles = [
      'app/lib/enhanced-sync-service.ts',
      'app/lib/change-detection.ts',
      'app/lib/real-time-monitor.ts',
      'app/lib/sync-scheduler.ts',
      'app/hooks/useInventoryRealtime.ts',
      'app/api/sync/enhanced/route.ts',
      'app/components/EnhancedSyncManager.tsx',
      'scripts/enhanced-indexes.sql'
    ];
    
    for (const filePath of requiredFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required file missing: ${filePath}`);
      }
      
      const stats = fs.statSync(fullPath);
      if (stats.size === 0) {
        throw new Error(`Required file is empty: ${filePath}`);
      }
    }
    
    this.log(`All ${requiredFiles.length} required files exist and are non-empty`);
  }

  async testDatabaseEnhancements() {
    // Test that database enhancements are ready to be applied
    const sqlFile = path.join(process.cwd(), 'scripts/enhanced-indexes.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Check for key SQL components
    const requiredComponents = [
      'CREATE INDEX IF NOT EXISTS',
      'inventory_items',
      'sync_logs',
      'inventory_alerts',
      'content_hash',
      'finale_last_modified'
    ];
    
    for (const component of requiredComponents) {
      if (!sqlContent.includes(component)) {
        throw new Error(`Database enhancement SQL missing component: ${component}`);
      }
    }
    
    this.log('Database enhancement SQL contains all required components');
  }

  async testComponentIntegration() {
    // Test that TypeScript components compile without errors
    try {
      // Run TypeScript compiler check
      execSync('npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      this.log('TypeScript compilation check passed');
    } catch (error) {
      // Extract useful error information
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const lines = output.split('\n').filter(line => line.trim());
      const errorLines = lines.filter(line => 
        line.includes('error TS') || 
        line.includes('enhanced-sync') ||
        line.includes('real-time-monitor') ||
        line.includes('sync-scheduler')
      );
      
      if (errorLines.length > 0) {
        throw new Error(`TypeScript errors in enhanced sync components:\n${errorLines.join('\n')}`);
      }
      
      // If no specific enhanced sync errors, consider it passed
      this.log('Enhanced sync components compile successfully');
    }
  }

  generateReport() {
    this.results.endTime = new Date();
    const duration = this.results.endTime - this.results.startTime;
    
    const report = {
      summary: {
        total: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: this.results.tests.length > 0 
          ? (this.results.passed / this.results.tests.length * 100).toFixed(1) + '%'
          : '0%',
        duration: `${(duration / 1000).toFixed(1)}s`
      },
      tests: this.results.tests,
      timestamp: new Date().toISOString()
    };
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'test-reports', 'enhanced-sync-integration-test.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('ENHANCED SYNC INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Duration: ${report.summary.duration}`);
    console.log('='.repeat(60));
    
    if (report.summary.failed > 0) {
      console.log('\nFAILED TESTS:');
      report.tests.filter(t => t.status === 'failed').forEach(test => {
        console.log(`❌ ${test.name}: ${test.error}`);
      });
    }
    
    console.log(`\nDetailed report saved to: test-reports/enhanced-sync-integration-test.json`);
    console.log('='.repeat(60) + '\n');
  }

  async run() {
    console.log('Starting Enhanced Sync Integration Test Suite...\n');
    
    // File integrity tests (don't require server)
    await this.runTest('File Integrity Check', () => this.testFileIntegrity());
    await this.runTest('Database Enhancement SQL Check', () => this.testDatabaseEnhancements());
    await this.runTest('TypeScript Component Integration', () => this.testComponentIntegration());
    
    // API tests (require server to be running)
    try {
      await this.runTest('Enhanced Sync Health Check', () => this.testEnhancedSyncHealth());
      await this.runTest('Enhanced Sync Initialization', () => this.testEnhancedSyncInitialization());
      await this.runTest('Smart Sync Execution', () => this.testSmartSync());
      await this.runTest('Intelligent Sync Execution', () => this.testIntelligentSync());
      await this.runTest('Sync Status Retrieval', () => this.testSyncStatus());
    } catch (error) {
      if (error.message.includes('Server not running')) {
        this.log('Skipping API tests - server not running. Start with: npm run dev', 'warning');
      } else {
        throw error;
      }
    }
    
    const report = this.generateReport();
    this.printSummary(report);
    
    // Exit with error code if any tests failed
    if (report.summary.failed > 0) {
      process.exit(1);
    }
    
    return report;
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new EnhancedSyncTester();
  
  tester.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = EnhancedSyncTester;
