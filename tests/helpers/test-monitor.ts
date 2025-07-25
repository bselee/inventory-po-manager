import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Continuous test monitoring and reporting system
 */

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
  duration: number;
  error?: string;
  retries?: number;
  timestamp: Date;
}

export interface TestMetrics {
  totalRuns: number;
  passRate: number;
  averageDuration: number;
  flakyTests: string[];
  failurePatterns: Map<string, number>;
  lastRun: Date;
}

export interface MonitoringReport {
  summary: {
    healthScore: number; // 0-100
    totalTests: number;
    passingTests: number;
    failingTests: number;
    flakyTests: number;
    averageRunTime: number;
  };
  criticalIssues: string[];
  recommendations: string[];
  testHistory: TestResult[];
  metrics: TestMetrics;
}

export class TestMonitor {
  private testHistory: TestResult[] = [];
  private metricsCache: Map<string, TestMetrics> = new Map();
  private readonly historyFile = 'test-reports/test-history.json';
  private readonly metricsFile = 'test-reports/test-metrics.json';
  private readonly dashboardFile = 'test-reports/dashboard.html';

  constructor() {
    this.loadHistory();
  }

  /**
   * Load test history from file
   */
  private async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8');
      this.testHistory = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
      this.testHistory = [];
    }

    try {
      const metricsData = await fs.readFile(this.metricsFile, 'utf-8');
      const metrics = JSON.parse(metricsData);
      this.metricsCache = new Map(Object.entries(metrics));
    } catch (error) {
      this.metricsCache = new Map();
    }
  }

  /**
   * Save test history to file
   */
  private async saveHistory() {
    await fs.mkdir('test-reports', { recursive: true });
    await fs.writeFile(this.historyFile, JSON.stringify(this.testHistory, null, 2));
    
    const metricsObj = Object.fromEntries(this.metricsCache);
    await fs.writeFile(this.metricsFile, JSON.stringify(metricsObj, null, 2));
  }

  /**
   * Record test result
   */
  async recordTestResult(result: TestResult) {
    this.testHistory.push(result);
    
    // Keep only last 1000 results
    if (this.testHistory.length > 1000) {
      this.testHistory = this.testHistory.slice(-1000);
    }

    // Update metrics
    this.updateMetrics(result);
    
    await this.saveHistory();
  }

  /**
   * Update test metrics
   */
  private updateMetrics(result: TestResult) {
    const metrics = this.metricsCache.get(result.testName) || {
      totalRuns: 0,
      passRate: 0,
      averageDuration: 0,
      flakyTests: [],
      failurePatterns: new Map(),
      lastRun: new Date()
    };

    metrics.totalRuns++;
    metrics.lastRun = result.timestamp;
    
    // Update pass rate
    const passCount = this.testHistory
      .filter(r => r.testName === result.testName && r.status === 'passed')
      .length;
    metrics.passRate = (passCount / metrics.totalRuns) * 100;

    // Update average duration
    const durations = this.testHistory
      .filter(r => r.testName === result.testName)
      .map(r => r.duration);
    metrics.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Detect flaky tests (failed after passing or vice versa)
    const recentResults = this.testHistory
      .filter(r => r.testName === result.testName)
      .slice(-5);
    
    const hasFlipped = recentResults.some((r, i) => 
      i > 0 && r.status !== recentResults[i - 1].status
    );
    
    if (hasFlipped && !metrics.flakyTests.includes(result.testName)) {
      metrics.flakyTests.push(result.testName);
    }

    // Track failure patterns
    if (result.status === 'failed' && result.error) {
      const pattern = this.categorizeError(result.error);
      metrics.failurePatterns.set(
        pattern,
        (metrics.failurePatterns.get(pattern) || 0) + 1
      );
    }

    this.metricsCache.set(result.testName, metrics);
  }

  /**
   * Categorize error messages
   */
  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('selector') || error.includes('locator')) return 'selector';
    if (error.includes('navigation')) return 'navigation';
    if (error.includes('network')) return 'network';
    if (error.includes('assertion')) return 'assertion';
    return 'other';
  }

  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<MonitoringReport> {
    const allTests = Array.from(this.metricsCache.keys());
    const passingTests = allTests.filter(test => {
      const metrics = this.metricsCache.get(test)!;
      return metrics.passRate >= 95;
    });
    
    const failingTests = allTests.filter(test => {
      const metrics = this.metricsCache.get(test)!;
      return metrics.passRate < 50;
    });

    const flakyTests = allTests.filter(test => {
      const metrics = this.metricsCache.get(test)!;
      return metrics.flakyTests.includes(test);
    });

    // Calculate health score
    const healthScore = this.calculateHealthScore();
    
    // Generate critical issues
    const criticalIssues = this.identifyCriticalIssues();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Calculate average run time
    const avgRunTime = Array.from(this.metricsCache.values())
      .reduce((sum, m) => sum + m.averageDuration, 0) / this.metricsCache.size;

    const report: MonitoringReport = {
      summary: {
        healthScore,
        totalTests: allTests.length,
        passingTests: passingTests.length,
        failingTests: failingTests.length,
        flakyTests: flakyTests.length,
        averageRunTime
      },
      criticalIssues,
      recommendations,
      testHistory: this.testHistory.slice(-100), // Last 100 results
      metrics: Object.fromEntries(this.metricsCache) as any
    };

    // Generate HTML dashboard
    await this.generateHTMLDashboard(report);

    return report;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(): number {
    let score = 100;
    
    // Deduct for failing tests
    const failingCount = Array.from(this.metricsCache.values())
      .filter(m => m.passRate < 50).length;
    score -= failingCount * 5;

    // Deduct for flaky tests
    const flakyCount = Array.from(this.metricsCache.values())
      .filter(m => m.flakyTests.length > 0).length;
    score -= flakyCount * 3;

    // Deduct for slow tests
    const slowCount = Array.from(this.metricsCache.values())
      .filter(m => m.averageDuration > 30000).length;
    score -= slowCount * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(): string[] {
    const issues: string[] = [];

    // Check for consistently failing tests
    this.metricsCache.forEach((metrics, testName) => {
      if (metrics.passRate === 0 && metrics.totalRuns > 3) {
        issues.push(`Test "${testName}" has never passed (${metrics.totalRuns} attempts)`);
      }
    });

    // Check for performance degradation
    this.metricsCache.forEach((metrics, testName) => {
      if (metrics.averageDuration > 60000) {
        issues.push(`Test "${testName}" is extremely slow (avg: ${(metrics.averageDuration / 1000).toFixed(1)}s)`);
      }
    });

    // Check for high flakiness
    const flakyTests = Array.from(this.metricsCache.entries())
      .filter(([_, m]) => m.flakyTests.length > 0);
    
    if (flakyTests.length > 5) {
      issues.push(`High test flakiness detected: ${flakyTests.length} flaky tests`);
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze failure patterns
    const allFailurePatterns = new Map<string, number>();
    this.metricsCache.forEach(metrics => {
      metrics.failurePatterns.forEach((count, pattern) => {
        allFailurePatterns.set(pattern, (allFailurePatterns.get(pattern) || 0) + count);
      });
    });

    // Recommend fixes based on patterns
    allFailurePatterns.forEach((count, pattern) => {
      if (count > 5) {
        switch (pattern) {
          case 'timeout':
            recommendations.push('Consider increasing timeout values or adding explicit waits');
            break;
          case 'selector':
            recommendations.push('Add data-testid attributes and use self-healing selectors');
            break;
          case 'network':
            recommendations.push('Implement network error handling and retry logic');
            break;
          case 'navigation':
            recommendations.push('Add navigation guards and wait for page ready states');
            break;
        }
      }
    });

    // Performance recommendations
    const slowTests = Array.from(this.metricsCache.entries())
      .filter(([_, m]) => m.averageDuration > 30000)
      .map(([name, _]) => name);
    
    if (slowTests.length > 0) {
      recommendations.push(`Optimize slow tests: ${slowTests.slice(0, 3).join(', ')}`);
    }

    // Flaky test recommendations
    const flakyCount = Array.from(this.metricsCache.values())
      .filter(m => m.flakyTests.length > 0).length;
    
    if (flakyCount > 0) {
      recommendations.push('Use self-healing utilities to reduce test flakiness');
    }

    return recommendations;
  }

  /**
   * Generate HTML dashboard
   */
  private async generateHTMLDashboard(report: MonitoringReport) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Monitoring Dashboard</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      margin: 10px 0;
    }
    .metric-label {
      color: #666;
      font-size: 14px;
    }
    .health-score {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: white;
      margin: 20px auto;
    }
    .health-good { background: #4caf50; }
    .health-warning { background: #ff9800; }
    .health-critical { background: #f44336; }
    .issues {
      background: #fff3cd;
      border: 1px solid #ffecd1;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .recommendations {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      padding: 15px;
    }
    .test-list {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .status-passed { color: #4caf50; }
    .status-failed { color: #f44336; }
    .status-flaky { color: #ff9800; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Monitoring Dashboard</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <div class="health-score ${
        report.summary.healthScore >= 80 ? 'health-good' :
        report.summary.healthScore >= 60 ? 'health-warning' : 'health-critical'
      }">
        ${report.summary.healthScore}%
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">${report.summary.totalTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Passing Tests</div>
        <div class="metric-value" style="color: #4caf50">${report.summary.passingTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Failing Tests</div>
        <div class="metric-value" style="color: #f44336">${report.summary.failingTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Flaky Tests</div>
        <div class="metric-value" style="color: #ff9800">${report.summary.flakyTests}</div>
      </div>
    </div>

    ${report.criticalIssues.length > 0 ? `
    <div class="issues">
      <h3>⚠️ Critical Issues</h3>
      <ul>
        ${report.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
      <h3>💡 Recommendations</h3>
      <ul>
        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="test-list">
      <h3>Recent Test Results</h3>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${report.testHistory.slice(-20).reverse().map(result => `
          <tr>
            <td>${result.testName}</td>
            <td class="status-${result.status}">${result.status}</td>
            <td>${(result.duration / 1000).toFixed(1)}s</td>
            <td>${new Date(result.timestamp).toLocaleTimeString()}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
`;

    await fs.writeFile(this.dashboardFile, html);
    console.log(`Dashboard updated: ${this.dashboardFile}`);
  }

  /**
   * Run continuous monitoring
   */
  async startMonitoring(intervalMinutes: number = 5) {
    console.log(`Starting test monitoring (interval: ${intervalMinutes} minutes)`);
    
    const runTests = async () => {
      try {
        // Run tests and capture results
        const { stdout, stderr } = await execAsync('npm run test:self-healing -- --reporter=json');
        
        // Parse results and record them
        // This is a simplified version - in reality you'd parse the JSON output
        console.log('Tests completed, updating dashboard...');
        
        // Generate report
        const report = await this.generateReport();
        console.log(`Health Score: ${report.summary.healthScore}%`);
        
      } catch (error) {
        console.error('Test run failed:', error);
      }
    };

    // Run immediately
    await runTests();
    
    // Then run on interval
    setInterval(runTests, intervalMinutes * 60 * 1000);
  }
}

// Export singleton instance
export const testMonitor = new TestMonitor();