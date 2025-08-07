#!/usr/bin/env node

/**
 * Comprehensive Security Audit for Purchase Order System
 * Checks for OWASP Top 10 vulnerabilities and security best practices
 */

import { supabase } from '../app/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  file?: string
  line?: number
  description: string
  recommendation: string
  owaspCategory?: string
}

class POSecurityAuditor {
  private issues: SecurityIssue[] = []
  private filesScanned = 0
  private testsRun = 0

  async runFullAudit(): Promise<void> {
    console.log('🔒 Starting Purchase Order System Security Audit...\n')

    // 1. Input Validation Checks
    await this.auditInputValidation()

    // 2. SQL Injection Prevention
    await this.auditSQLInjection()

    // 3. XSS Prevention
    await this.auditXSSPrevention()

    // 4. Authorization & Access Control
    await this.auditAuthorization()

    // 5. CSRF Protection
    await this.auditCSRFProtection()

    // 6. Sensitive Data Exposure
    await this.auditDataExposure()

    // 7. Security Headers
    await this.auditSecurityHeaders()

    // 8. Rate Limiting
    await this.auditRateLimiting()

    // 9. Audit Logging
    await this.auditLogging()

    // 10. Dependencies Security
    await this.auditDependencies()

    // Generate Report
    this.generateReport()
  }

  private async auditInputValidation(): Promise<void> {
    console.log('📝 Auditing Input Validation...')

    const apiRoutes = [
      '/app/api/purchase-orders/generate/route.ts',
      '/app/api/purchase-orders/create/route.ts',
      '/app/api/purchase-orders/[id]/approve/route.ts',
      '/app/api/purchase-orders/[id]/reject/route.ts'
    ]

    for (const route of apiRoutes) {
      const filePath = path.join(process.cwd(), route)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.filesScanned++

        // Check for quantity validation
        if (content.includes('quantity') && !content.includes('quantity > 0')) {
          this.issues.push({
            severity: 'high',
            category: 'Input Validation',
            file: route,
            description: 'Missing validation for positive quantity values',
            recommendation: 'Add validation: if (quantity <= 0) throw new Error("Quantity must be positive")',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for email validation
        if (content.includes('email') && !content.includes('email.match') && !content.includes('@')) {
          this.issues.push({
            severity: 'medium',
            category: 'Input Validation',
            file: route,
            description: 'Missing email format validation',
            recommendation: 'Use regex validation: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for amount validation
        if (content.includes('amount') || content.includes('cost')) {
          if (!content.includes('isNaN') && !content.includes('typeof') && !content.includes('Number.')) {
            this.issues.push({
              severity: 'high',
              category: 'Input Validation',
              file: route,
              description: 'Missing numeric validation for monetary values',
              recommendation: 'Validate: if (isNaN(amount) || amount < 0) throw new Error("Invalid amount")',
              owaspCategory: 'A03:2021 - Injection'
            })
          }
        }

        // Check for array bounds
        if (content.includes('.map(') || content.includes('.forEach(')) {
          if (!content.includes('Array.isArray')) {
            this.issues.push({
              severity: 'medium',
              category: 'Input Validation',
              file: route,
              description: 'Missing array type validation before iteration',
              recommendation: 'Add: if (!Array.isArray(items)) throw new Error("Invalid items array")',
              owaspCategory: 'A03:2021 - Injection'
            })
          }
        }

        // Check for max length validation
        if (content.includes('notes') || content.includes('description')) {
          if (!content.includes('.length >') && !content.includes('maxLength')) {
            this.issues.push({
              severity: 'low',
              category: 'Input Validation',
              file: route,
              description: 'Missing max length validation for text fields',
              recommendation: 'Add: if (notes.length > 1000) throw new Error("Notes too long")',
              owaspCategory: 'A03:2021 - Injection'
            })
          }
        }
      }
    }
    this.testsRun += 5
  }

  private async auditSQLInjection(): Promise<void> {
    console.log('💉 Auditing SQL Injection Prevention...')

    const libFiles = [
      '/app/lib/po-generation-service.ts',
      '/app/lib/purchase-order-service.ts'
    ]

    for (const file of libFiles) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.filesScanned++

        // Check for raw SQL queries
        if (content.includes('raw(') || content.includes('rpc(')) {
          this.issues.push({
            severity: 'critical',
            category: 'SQL Injection',
            file,
            description: 'Raw SQL query detected - potential injection risk',
            recommendation: 'Use parameterized queries or Supabase query builder',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for string concatenation in queries
        if (content.match(/from\(['"]\w+['"]\s*\+/)) {
          this.issues.push({
            severity: 'critical',
            category: 'SQL Injection',
            file,
            description: 'String concatenation in query - SQL injection risk',
            recommendation: 'Use parameterized queries instead of concatenation',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for dynamic column names
        if (content.includes('select(`${')) {
          this.issues.push({
            severity: 'high',
            category: 'SQL Injection',
            file,
            description: 'Dynamic column selection without validation',
            recommendation: 'Whitelist allowed column names before use',
            owaspCategory: 'A03:2021 - Injection'
          })
        }
      }
    }
    this.testsRun += 3
  }

  private async auditXSSPrevention(): Promise<void> {
    console.log('🛡️ Auditing XSS Prevention...')

    const componentFiles = [
      '/app/components/purchase-orders/POGenerationDashboard.tsx',
      '/app/components/purchase-orders/POSuggestionCard.tsx',
      '/app/components/purchase-orders/POCreationWizard.tsx'
    ]

    for (const file of componentFiles) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.filesScanned++

        // Check for dangerouslySetInnerHTML
        if (content.includes('dangerouslySetInnerHTML')) {
          this.issues.push({
            severity: 'critical',
            category: 'XSS',
            file,
            description: 'dangerouslySetInnerHTML usage detected',
            recommendation: 'Use text content or sanitize HTML with DOMPurify',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for unescaped user input
        if (content.includes('innerHTML') || content.includes('outerHTML')) {
          this.issues.push({
            severity: 'high',
            category: 'XSS',
            file,
            description: 'Direct HTML manipulation detected',
            recommendation: 'Use React state and props instead of direct DOM manipulation',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for eval usage
        if (content.includes('eval(') || content.includes('Function(')) {
          this.issues.push({
            severity: 'critical',
            category: 'XSS',
            file,
            description: 'eval() or Function() constructor usage',
            recommendation: 'Remove eval/Function usage - use JSON.parse for data',
            owaspCategory: 'A03:2021 - Injection'
          })
        }

        // Check for proper escaping in templates
        if (content.includes('`') && content.includes('${') && !content.includes('escape')) {
          // Check if user data is being interpolated
          const templateMatches = content.match(/\$\{[^}]*user[^}]*\}/gi)
          if (templateMatches) {
            this.issues.push({
              severity: 'medium',
              category: 'XSS',
              file,
              description: 'User data in template literals without escaping',
              recommendation: 'Escape user input before template interpolation',
              owaspCategory: 'A03:2021 - Injection'
            })
          }
        }
      }
    }
    this.testsRun += 4
  }

  private async auditAuthorization(): Promise<void> {
    console.log('🔐 Auditing Authorization & Access Control...')

    const apiFiles = fs.readdirSync(path.join(process.cwd(), 'app/api/purchase-orders'), { recursive: true })
      .filter(f => f.toString().endsWith('.ts'))
      .map(f => `/app/api/purchase-orders/${f.toString()}`)

    for (const file of apiFiles) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath) && !file.includes('test')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.filesScanned++

        // Check for authorization checks
        if (!content.includes('userId') && !content.includes('session') && !content.includes('auth')) {
          this.issues.push({
            severity: 'critical',
            category: 'Authorization',
            file,
            description: 'Missing authorization check in API route',
            recommendation: 'Add user authentication check before processing request',
            owaspCategory: 'A01:2021 - Broken Access Control'
          })
        }

        // Check for approval workflow authorization
        if (file.includes('approve') || file.includes('reject')) {
          if (!content.includes('role') && !content.includes('permission')) {
            this.issues.push({
              severity: 'high',
              category: 'Authorization',
              file,
              description: 'Missing role-based access control for approval actions',
              recommendation: 'Verify user has approval permissions before processing',
              owaspCategory: 'A01:2021 - Broken Access Control'
            })
          }
        }

        // Check for vendor access control
        if (content.includes('vendor_id')) {
          if (!content.includes('user.vendor_id') && !content.includes('allowedVendors')) {
            this.issues.push({
              severity: 'high',
              category: 'Authorization',
              file,
              description: 'Missing vendor-level access control',
              recommendation: 'Verify user has access to specific vendor data',
              owaspCategory: 'A01:2021 - Broken Access Control'
            })
          }
        }
      }
    }
    this.testsRun += 3
  }

  private async auditCSRFProtection(): Promise<void> {
    console.log('🔄 Auditing CSRF Protection...')

    const mutationRoutes = fs.readdirSync(path.join(process.cwd(), 'app/api/purchase-orders'), { recursive: true })
      .filter(f => f.toString().endsWith('route.ts'))
      .map(f => f.toString())

    for (const file of mutationRoutes) {
      const filePath = path.join(process.cwd(), 'app/api/purchase-orders', file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        // Check for POST/PUT/DELETE methods
        if (content.includes('POST') || content.includes('PUT') || content.includes('DELETE')) {
          if (!content.includes('csrf') && !content.includes('X-CSRF-Token')) {
            this.issues.push({
              severity: 'high',
              category: 'CSRF',
              file: `/app/api/purchase-orders/${file}`,
              description: 'Missing CSRF token validation for state-changing operation',
              recommendation: 'Implement CSRF token validation for mutations',
              owaspCategory: 'A01:2021 - Broken Access Control'
            })
          }
        }
      }
    }
    this.testsRun += 1
  }

  private async auditDataExposure(): Promise<void> {
    console.log('🔍 Auditing Sensitive Data Exposure...')

    const allFiles = [
      ...fs.readdirSync(path.join(process.cwd(), 'app/api/purchase-orders'), { recursive: true })
        .filter(f => f.toString().endsWith('.ts'))
        .map(f => `/app/api/purchase-orders/${f.toString()}`),
      '/app/lib/po-generation-service.ts'
    ]

    for (const file of allFiles) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath) && !file.includes('test')) {
        const content = fs.readFileSync(filePath, 'utf-8')

        // Check for sensitive data in responses
        if (content.includes('password') || content.includes('apiKey') || content.includes('secret')) {
          this.issues.push({
            severity: 'critical',
            category: 'Data Exposure',
            file,
            description: 'Potential sensitive data exposure in response',
            recommendation: 'Remove sensitive fields from API responses',
            owaspCategory: 'A02:2021 - Cryptographic Failures'
          })
        }

        // Check for PII exposure
        if (content.includes('ssn') || content.includes('creditCard') || content.includes('bankAccount')) {
          this.issues.push({
            severity: 'critical',
            category: 'Data Exposure',
            file,
            description: 'PII data potentially exposed',
            recommendation: 'Mask or encrypt PII data in responses',
            owaspCategory: 'A02:2021 - Cryptographic Failures'
          })
        }

        // Check for error message leakage
        if (content.includes('stack') || content.includes('Error:') && content.includes('at ')) {
          this.issues.push({
            severity: 'medium',
            category: 'Data Exposure',
            file,
            description: 'Stack traces exposed in error messages',
            recommendation: 'Use generic error messages in production',
            owaspCategory: 'A05:2021 - Security Misconfiguration'
          })
        }
      }
    }
    this.testsRun += 3
  }

  private async auditSecurityHeaders(): Promise<void> {
    console.log('📋 Auditing Security Headers...')

    // Check middleware configuration
    const middlewarePath = path.join(process.cwd(), 'middleware.ts')
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf-8')
      this.filesScanned++

      const requiredHeaders = [
        { name: 'X-Frame-Options', value: 'DENY' },
        { name: 'X-Content-Type-Options', value: 'nosniff' },
        { name: 'X-XSS-Protection', value: '1; mode=block' },
        { name: 'Strict-Transport-Security', value: 'max-age=' },
        { name: 'Content-Security-Policy', value: 'default-src' }
      ]

      for (const header of requiredHeaders) {
        if (!content.includes(header.name)) {
          this.issues.push({
            severity: 'medium',
            category: 'Security Headers',
            file: 'middleware.ts',
            description: `Missing security header: ${header.name}`,
            recommendation: `Add header: ${header.name}: ${header.value}`,
            owaspCategory: 'A05:2021 - Security Misconfiguration'
          })
        }
      }
    }
    this.testsRun += 1
  }

  private async auditRateLimiting(): Promise<void> {
    console.log('⏱️ Auditing Rate Limiting...')

    const criticalRoutes = [
      '/app/api/purchase-orders/generate/route.ts',
      '/app/api/purchase-orders/create/route.ts',
      '/app/api/purchase-orders/[id]/approve/route.ts'
    ]

    for (const route of criticalRoutes) {
      const filePath = path.join(process.cwd(), route)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        if (!content.includes('rateLimit') && !content.includes('rateLimiter')) {
          this.issues.push({
            severity: 'high',
            category: 'Rate Limiting',
            file: route,
            description: 'Missing rate limiting on critical endpoint',
            recommendation: 'Implement rate limiting to prevent abuse',
            owaspCategory: 'A04:2021 - Insecure Design'
          })
        }
      }
    }
    this.testsRun += 1
  }

  private async auditLogging(): Promise<void> {
    console.log('📝 Auditing Security Logging...')

    const criticalActions = [
      { file: '/app/api/purchase-orders/[id]/approve/route.ts', action: 'PO approval' },
      { file: '/app/api/purchase-orders/[id]/reject/route.ts', action: 'PO rejection' },
      { file: '/app/api/purchase-orders/create/route.ts', action: 'PO creation' }
    ]

    for (const { file, action } of criticalActions) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        if (!content.includes('auditLog') && !content.includes('logger')) {
          this.issues.push({
            severity: 'medium',
            category: 'Audit Logging',
            file,
            description: `Missing audit logging for ${action}`,
            recommendation: `Add audit log entry for ${action} with user, timestamp, and details`,
            owaspCategory: 'A09:2021 - Security Logging and Monitoring Failures'
          })
        }
      }
    }
    this.testsRun += 1
  }

  private async auditDependencies(): Promise<void> {
    console.log('📦 Auditing Dependencies...')

    // Check for known vulnerable dependencies
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Check for outdated security-critical packages
      const criticalPackages = ['react', 'next', 'supabase']
      
      for (const pkg of criticalPackages) {
        if (packageJson.dependencies[pkg]) {
          // Simple version check (in production, use npm audit)
          const version = packageJson.dependencies[pkg]
          if (version.includes('^') || version.includes('~')) {
            this.issues.push({
              severity: 'low',
              category: 'Dependencies',
              description: `Flexible version range for security-critical package: ${pkg}`,
              recommendation: 'Pin exact versions for security-critical dependencies',
              owaspCategory: 'A06:2021 - Vulnerable and Outdated Components'
            })
          }
        }
      }
    }
    this.testsRun += 1
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80))
    console.log('SECURITY AUDIT REPORT - PURCHASE ORDER SYSTEM')
    console.log('='.repeat(80))
    console.log(`\nAudit Date: ${new Date().toISOString()}`)
    console.log(`Files Scanned: ${this.filesScanned}`)
    console.log(`Security Tests Run: ${this.testsRun}`)
    console.log(`Total Issues Found: ${this.issues.length}`)

    // Group issues by severity
    const critical = this.issues.filter(i => i.severity === 'critical')
    const high = this.issues.filter(i => i.severity === 'high')
    const medium = this.issues.filter(i => i.severity === 'medium')
    const low = this.issues.filter(i => i.severity === 'low')

    console.log('\n📊 ISSUE SUMMARY:')
    console.log(`  🔴 Critical: ${critical.length}`)
    console.log(`  🟠 High: ${high.length}`)
    console.log(`  🟡 Medium: ${medium.length}`)
    console.log(`  🟢 Low: ${low.length}`)

    // OWASP Coverage
    console.log('\n🛡️ OWASP TOP 10 COVERAGE:')
    const owaspCategories = new Set(this.issues.map(i => i.owaspCategory).filter(Boolean))
    owaspCategories.forEach(cat => {
      const count = this.issues.filter(i => i.owaspCategory === cat).length
      console.log(`  ${cat}: ${count} issues`)
    })

    // Detailed Issues
    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES (Fix Immediately):')
      critical.forEach(issue => this.printIssue(issue))
    }

    if (high.length > 0) {
      console.log('\n🟠 HIGH PRIORITY ISSUES:')
      high.forEach(issue => this.printIssue(issue))
    }

    if (medium.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY ISSUES:')
      medium.forEach(issue => this.printIssue(issue))
    }

    if (low.length > 0) {
      console.log('\n🟢 LOW PRIORITY ISSUES:')
      low.forEach(issue => this.printIssue(issue))
    }

    // Compliance Status
    console.log('\n✅ COMPLIANCE STATUS:')
    const passRate = ((this.testsRun - this.issues.length) / this.testsRun * 100).toFixed(1)
    console.log(`  Security Test Pass Rate: ${passRate}%`)
    console.log(`  OWASP Compliance: ${critical.length === 0 ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`  Production Ready: ${critical.length === 0 && high.length < 3 ? '✅ YES' : '❌ NO'}`)

    // Recommendations
    console.log('\n📋 TOP RECOMMENDATIONS:')
    const recommendations = [
      critical.length > 0 && 'Fix all critical security issues before deployment',
      high.length > 0 && 'Address high-priority authorization and validation issues',
      'Implement comprehensive audit logging for all PO operations',
      'Add rate limiting to prevent abuse of PO generation endpoints',
      'Set up automated security scanning in CI/CD pipeline'
    ].filter(Boolean)

    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    // Save report to file
    const reportPath = path.join(process.cwd(), 'security-audit-report.json')
    fs.writeFileSync(reportPath, JSON.stringify({
      date: new Date().toISOString(),
      summary: {
        filesScanned: this.filesScanned,
        testsRun: this.testsRun,
        totalIssues: this.issues.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
        passRate: parseFloat(passRate),
        owaspCompliant: critical.length === 0
      },
      issues: this.issues
    }, null, 2))

    console.log(`\n📄 Full report saved to: ${reportPath}`)
  }

  private printIssue(issue: SecurityIssue): void {
    console.log(`\n  Category: ${issue.category}`)
    if (issue.file) console.log(`  File: ${issue.file}`)
    if (issue.line) console.log(`  Line: ${issue.line}`)
    console.log(`  Issue: ${issue.description}`)
    console.log(`  Fix: ${issue.recommendation}`)
    if (issue.owaspCategory) console.log(`  OWASP: ${issue.owaspCategory}`)
  }
}

// Run the audit
const auditor = new POSecurityAuditor()
auditor.runFullAudit().catch(console.error)