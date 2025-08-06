#!/usr/bin/env node

/**
 * Fix Sync Errors Script
 * Addresses the immediate JSON parsing issues in finale-api.ts
 */

const fs = require('fs');
const path = require('path');

const finaleApiPath = path.join(__dirname, '../app/lib/finale-api.ts');

// Read the current file
let content = fs.readFileSync(finaleApiPath, 'utf8');

// Fix 1: Add safe JSON parsing helper method
const safeParseJsonMethod = `
  /**
   * Safely parse JSON response with better error handling
   */
  private async safeParseJson(response: Response): Promise<any> {
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = \`Finale API error: \${response.status} \${response.statusText}\`;
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

    try {
      return await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, try to get the raw text
      try {
        const rawText = await response.text();
        console.error('Failed to parse JSON response:', rawText.substring(0, 200));
        throw new Error(\`Invalid JSON response from Finale API: \${rawText.substring(0, 100)}...\`);
      } catch (textError) {
        // Response already consumed, throw original JSON error
        console.error('JSON parsing failed and could not read response text:', jsonError);
        throw new Error('Invalid JSON response from Finale API');
      }
    }
  }
`;

// Fix 2: Replace problematic JSON parsing patterns
const fixes = [
  {
    find: /if \(!response\.ok\) \{\s*throw new Error\(`Product API error: \${response\.status}`\)\s*\}\s*const data = await response\.json\(\)/gs,
    replace: 'const data = await this.safeParseJson(response)'
  },
  {
    find: /if \(!inventoryResponse\.ok\) \{\s*throw new Error\(`Inventory API error: \${inventoryResponse\.status}`\)\s*\}\s*const inventoryData = await inventoryResponse\.json\(\)/gs,
    replace: 'const inventoryData = await this.safeParseJson(inventoryResponse)'
  },
  {
    find: /if \(!response\.ok\) \{\s*throw new Error\(`Finale API error: \${response\.status}`\)\s*\}\s*return await response\.json\(\)/gs,
    replace: 'return await this.safeParseJson(response)'
  }
];

// Apply fixes
// Add the safe parse method after the constructor
const constructorEndPattern = /(\s*this\.authHeader = .+?\n\s*})/;
if (constructorEndPattern.test(content)) {
  content = content.replace(constructorEndPattern, `$1${safeParseJsonMethod}`);
} else {
}

// Apply other fixes
fixes.forEach((fix, index) => {
  const before = content;
  content = content.replace(fix.find, fix.replace);
  if (content !== before) {
  } else {
  }
});

// Fix Map iteration issues for ES5 compatibility
content = content.replace(
  /for \(const \[([^,]+), ([^\]]+)\] of ([^)]+)\) \{/g,
  'Array.from($3.entries()).forEach(([_$1, _$2]) => { const $1 = _$1; const $2 = _$2;'
);

// Add missing interface properties
const finaleProductInterface = content.match(/interface FinaleProduct \{[^}]+\}/s);
if (finaleProductInterface) {
  const updatedInterface = finaleProductInterface[0].replace(
    /(\s*lastModifiedDate\?: string\s*)/,
    "$1  statusId?: string\n  discontinued?: boolean\n  active?: boolean"
  );
  content = content.replace(finaleProductInterface[0], updatedInterface);
}

// Fix date handling
content = content.replace(
  /new Date\(finaleProduct\.lastModifiedDate\)\.getFullYear\(\)/g,
  'finaleProduct.lastModifiedDate ? new Date(finaleProduct.lastModifiedDate).getFullYear() : new Date().getFullYear()'
);

// Write the fixed file
fs.writeFileSync(finaleApiPath, content);
// Verify the file compiles
const { execSync } = require('child_process');
try {
  execSync('npm run type-check', { stdio: 'pipe' });
} catch (error) {
  console.log(error.stdout?.toString() || error.message);
}