#!/usr/bin/env node

/**
 * Script to remove or convert console.log statements to proper logging
 * Keeps error logs but converts them to use the monitoring service
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface ProcessResult {
  file: string
  removed: number
  converted: number
  errors: number
}

class ConsoleLogRemover {
  private results: ProcessResult[] = []
  private totalRemoved = 0
  private totalConverted = 0
  private totalErrors = 0
  private dryRun: boolean

  constructor(dryRun = false) {
    this.dryRun = dryRun
  }

  async process(): Promise<void> {
    console.log(`Starting console.log removal (${this.dryRun ? 'DRY RUN' : 'ACTUAL RUN'})...`)
    
    // Find all TypeScript and JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      ignore: [
        'node_modules/**',
        '.next/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'scripts/remove-console-logs.ts', // Don't process this file
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}'
      ],
      cwd: '/mnt/c/Users/BuildaSoil/inventory-po-manager'
    })

    console.log(`Found ${files.length} files to process`)

    for (const file of files) {
      await this.processFile(path.join('/mnt/c/Users/BuildaSoil/inventory-po-manager', file))
    }

    this.printSummary()
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const result: ProcessResult = {
        file: filePath,
        removed: 0,
        converted: 0,
        errors: 0
      }

      let modified = content

      // Pattern to match console statements
      const consolePatterns = [
        {
          // Simple console.log statements
          pattern: /^\s*console\.log\([^)]*\);?\s*$/gm,
          action: 'remove',
          replacement: ''
        },
        {
          // Console.log with template literals
          pattern: /^\s*console\.log\(`[^`]*`\);?\s*$/gm,
          action: 'remove',
          replacement: ''
        },
        {
          // Console.error - convert to logging
          pattern: /console\.error\(([^)]+)\)/g,
          action: 'convert',
          replacement: (match: string, args: string) => {
            // Only convert in non-test files and client components
            if (filePath.includes('/app/') && !filePath.includes('.test.')) {
              result.converted++
              return `logError(${args})`
            }
            return match
          }
        },
        {
          // Console.warn - convert to logging
          pattern: /console\.warn\(([^)]+)\)/g,
          action: 'convert',
          replacement: (match: string, args: string) => {
            if (filePath.includes('/app/') && !filePath.includes('.test.')) {
              result.converted++
              return `logWarn(${args})`
            }
            return match
          }
        },
        {
          // Multi-line console.log
          pattern: /console\.log\([^)]*\n[^)]*\);?/gm,
          action: 'remove',
          replacement: ''
        },
        {
          // Debug console statements
          pattern: /^\s*console\.(debug|info|trace|time|timeEnd|group|groupEnd)\([^)]*\);?\s*$/gm,
          action: 'remove',
          replacement: ''
        }
      ]

      // Apply patterns
      for (const { pattern, action, replacement } of consolePatterns) {
        if (action === 'remove') {
          const matches = modified.match(pattern)
          if (matches) {
            result.removed += matches.length
            modified = modified.replace(pattern, replacement as string)
          }
        } else if (action === 'convert' && typeof replacement === 'function') {
          modified = modified.replace(pattern, replacement)
        }
      }

      // Add import for logging functions if we converted any
      if (result.converted > 0 && !modified.includes('logError') && !modified.includes('logWarn')) {
        // Add import at the top of the file after any existing imports
        const importStatement = "import { logError, logWarn } from '@/app/lib/monitoring'\n"
        
        // Find the right place to insert
        const firstImportMatch = modified.match(/^import .* from/m)
        if (firstImportMatch) {
          const insertIndex = modified.indexOf(firstImportMatch[0])
          modified = modified.slice(0, insertIndex) + importStatement + modified.slice(insertIndex)
        } else {
          // No imports, add at the beginning
          modified = importStatement + modified
        }
      }

      // Clean up empty lines left behind
      modified = modified.replace(/^\s*\n\s*\n\s*\n/gm, '\n\n')

      // Save the file if changes were made
      if (modified !== content) {
        if (!this.dryRun) {
          await fs.promises.writeFile(filePath, modified, 'utf-8')
        }
        
        this.results.push(result)
        this.totalRemoved += result.removed
        this.totalConverted += result.converted
        this.totalErrors += result.errors

        console.log(
          `${path.relative('/mnt/c/Users/BuildaSoil/inventory-po-manager', filePath)}: ` +
          `Removed ${result.removed}, Converted ${result.converted}`
        )
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error)
      this.totalErrors++
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total files processed: ${this.results.length}`)
    console.log(`Total console.logs removed: ${this.totalRemoved}`)
    console.log(`Total statements converted: ${this.totalConverted}`)
    console.log(`Total errors: ${this.totalErrors}`)
    
    if (this.dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No files were actually modified.')
      console.log('Run with --apply to make actual changes.')
    } else {
      console.log('\n✅ Console.log statements have been removed/converted.')
    }

    // Show top files with most removals
    const topFiles = this.results
      .sort((a, b) => (b.removed + b.converted) - (a.removed + a.converted))
      .slice(0, 10)

    if (topFiles.length > 0) {
      console.log('\nTop files with most changes:')
      topFiles.forEach(result => {
        const relativePath = path.relative('/mnt/c/Users/BuildaSoil/inventory-po-manager', result.file)
        console.log(`  ${relativePath}: ${result.removed + result.converted} changes`)
      })
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = !args.includes('--apply')

// Run the remover
const remover = new ConsoleLogRemover(dryRun)
remover.process().catch(console.error)