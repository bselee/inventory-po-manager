#!/usr/bin/env node

/**
 * Quick Fix for JSON Parsing Error
 * This script addresses the immediate "Unexpected token 'A'" error
 */

const fs = require('fs');
const path = require('path');

const finaleApiPath = path.join(__dirname, '../app/lib/finale-api.ts');
try {
  let content = fs.readFileSync(finaleApiPath, 'utf8');
  
  // Add safe JSON parsing method after the constructor
  const safeParseMethod = `
  /**
   * Safely parse JSON response with better error handling
   */
  private async safeParseJson(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      let errorMessage = \`Finale API error \${response.status} \${response.statusText}\`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += \` - \${errorText}\`;
        }
      } catch (e) {
        // If we can't read the error, use the status
      }
      throw new Error(errorMessage);
    }
    
    if (!contentType.includes('application/json')) {
      const textResponse = await response.text();
      throw new Error(\`Expected JSON but got \${contentType}: \${textResponse.substring(0, 200)}\`);
    }
    
    try {
      return await response.json();
    } catch (jsonError) {
      const rawText = await response.text();
      console.error('Failed to parse JSON response:', rawText.substring(0, 200));
      throw new Error(\`Invalid JSON from Finale API: \${rawText.substring(0, 100)}...\`);
    }
  }
`;

  // Find the end of the constructor and add the method
  const constructorPattern = /(this\.authHeader = [^}]+})/;
  if (constructorPattern.test(content)) {
    content = content.replace(constructorPattern, `$1${safeParseMethod}`);
  } else {
  }

  // Fix the problematic JSON parsing calls one by one
  const fixes = [
    {
      pattern: /const data = await response\.json\(\)/g,
      replacement: 'const data = await this.safeParseJson(response)',
      description: 'Fixed product data parsing'
    },
    {
      pattern: /const inventoryData = await inventoryResponse\.json\(\)/g,
      replacement: 'const inventoryData = await this.safeParseJson(inventoryResponse)',
      description: 'Fixed inventory data parsing'
    },
    {
      pattern: /return await response\.json\(\)/g,
      replacement: 'return await this.safeParseJson(response)',
      description: 'Fixed generic response parsing'
    }
  ];

  let fixesApplied = 0;
  fixes.forEach(fix => {
    const before = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== before) {
      fixesApplied++;
    }
  });

  // Add missing interface properties
  const finaleProductPattern = /(interface FinaleProduct \{[^}]+)(})/s;
  if (finaleProductPattern.test(content)) {
    content = content.replace(finaleProductPattern, `$1  statusId?: string
  discontinued?: boolean
  active?: boolean
$2`);
  }

  // Fix date handling to prevent undefined errors
  content = content.replace(
    /new Date\(finaleProduct\.lastModifiedDate\)\.getFullYear\(\)/g,
    'finaleProduct.lastModifiedDate ? new Date(finaleProduct.lastModifiedDate).getFullYear() : new Date().getFullYear()'
  );
  // Write the fixed file
  fs.writeFileSync(finaleApiPath, content);
  // Test TypeScript compilation
  const { execSync } = require('child_process');
  try {
    execSync('npm run type-check', { stdio: 'pipe' });
  } catch (error) {
    const output = error.stdout?.toString() || error.message;
    console.log(output.substring(0, 500) + '...');
  }
} catch (error) {
  console.error('❌ Error applying fix:', error.message);
  process.exit(1);
}
