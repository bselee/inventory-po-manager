#!/bin/bash
# setup-coding-hooks.sh - Complete Claude Code automation setup

echo "🚀 Setting up Claude Code automation tools..."

# Install Node.js tools globally
echo "📦 Installing Node.js tools..."
npm install -g \
  eslint prettier \
  typescript ts-node \
  @openapitools/openapi-generator-cli \
  npm-check-updates \
  import-sort-cli \
  lint-staged \
  complexity-report \
  unimported \
  snyk \
  semgrep \
  jscodeshift \
  madge \
  depcheck

# Install Python tools
echo "🐍 Installing Python tools..."
pip install --user \
  flake8 black autopep8 pylint \
  mypy bandit safety \
  isort autoflake \
  pytest pytest-cov

# Create hook scripts directory
mkdir -p ~/.claude/scripts

# 1. Auto Test Generation Script (already created)
cat > ~/.claude/scripts/auto-test-gen.sh << 'EOF'
#!/bin/bash
FILE=$1
BASE=$(basename $FILE .${FILE##*.})
TEST_DIR=$(dirname $FILE)/tests
TEST_FILE="$TEST_DIR/test_${BASE}.${FILE##*.}"

mkdir -p $TEST_DIR

if [[ ! -f $TEST_FILE ]] && grep -E "(function|def|class)" $FILE; then
    case "${FILE##*.}" in
        js|ts|jsx|tsx)
            echo "// Auto-generated test for $FILE
import { describe, it, expect } from '@jest/globals';
import * as module from '../${BASE}';

describe('$BASE', () => {
    it('should be defined', () => {
        expect(module).toBeDefined();
    });
});" > $TEST_FILE
            ;;
        py)
            echo "# Auto-generated test for $FILE
import pytest
from .. import ${BASE}

class Test${BASE^}:
    def test_import(self):
        assert ${BASE} is not None
" > $TEST_FILE
            ;;
    esac
    echo "✅ Generated test: $TEST_FILE"
fi
EOF

# 2. Auto Documentation Generator
cat > ~/.claude/scripts/auto-doc.py << 'EOF'
#!/usr/bin/env python3
import sys
import re
import os

def generate_docs(filepath):
    """Generate documentation from code comments and structure"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Extract functions/classes
    functions = re.findall(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', content)
    classes = re.findall(r'(?:export\s+)?class\s+(\w+)', content)
    
    doc_path = filepath.replace('.ts', '.md').replace('.js', '.md')
    
    with open(doc_path, 'w') as f:
        f.write(f"# Documentation for {os.path.basename(filepath)}\n\n")
        
        if functions:
            f.write("## Functions\n\n")
            for func in functions:
                f.write(f"### {func}\n\n")
                f.write("TODO: Add description\n\n")
        
        if classes:
            f.write("## Classes\n\n")
            for cls in classes:
                f.write(f"### {cls}\n\n")
                f.write("TODO: Add description\n\n")
    
    print(f"📚 Generated docs: {doc_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_docs(sys.argv[1])
EOF

# 3. TypeScript Type Generator
cat > ~/.claude/scripts/generate-types.ts << 'EOF'
#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

const generateTypes = (jsonFile: string) => {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  const typeName = path.basename(jsonFile, '.json');
  
  const generateInterface = (obj: any, name: string): string => {
    let result = `export interface ${name} {\n`;
    
    for (const [key, value] of Object.entries(obj)) {
      const type = Array.isArray(value) ? 'any[]' : typeof value;
      result += `  ${key}: ${type};\n`;
    }
    
    result += '}\n';
    return result;
  };
  
  const output = generateInterface(data, typeName);
  const outputFile = jsonFile.replace('.json', '.types.ts');
  
  fs.writeFileSync(outputFile, output);
  console.log(`✅ Generated types: ${outputFile}`);
};

if (process.argv[2]) {
  generateTypes(process.argv[2]);
}
EOF

# 4. README Auto-updater
cat > ~/.claude/scripts/update-readme.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const updateReadme = () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const readmePath = 'README.md';
  
  let readme = fs.existsSync(readmePath) 
    ? fs.readFileSync(readmePath, 'utf-8')
    : `# ${pkg.name}\n\n${pkg.description || ''}\n`;
  
  // Update scripts section
  const scriptsSection = `## Available Scripts\n\n${
    Object.entries(pkg.scripts || {})
      .map(([cmd, script]) => `- \`npm run ${cmd}\`: ${script}`)
      .join('\n')
  }\n`;
  
  // Update dependencies section
  const depsSection = `## Dependencies\n\n${
    Object.keys(pkg.dependencies || {})
      .map(dep => `- ${dep}`)
      .join('\n')
  }\n`;
  
  // Replace or append sections
  readme = readme.replace(/## Available Scripts[\s\S]*?(?=##|$)/, scriptsSection);
  readme = readme.replace(/## Dependencies[\s\S]*?(?=##|$)/, depsSection);
  
  fs.writeFileSync(readmePath, readme);
  console.log('📝 Updated README.md');
};

updateReadme();
EOF

# 5. CRUD Scaffolder
cat > ~/.claude/scripts/scaffold-crud.sh << 'EOF'
#!/bin/bash
ENTITY=$1
ENTITY_LOWER=$(echo $ENTITY | tr '[:upper:]' '[:lower:]')
ENTITY_PLURAL="${ENTITY_LOWER}s"

if [ -z "$ENTITY" ]; then
    echo "Usage: scaffold-crud.sh <EntityName>"
    exit 1
fi

# Create API routes
mkdir -p app/api/$ENTITY_PLURAL

# Create list/create route
cat > app/api/$ENTITY_PLURAL/route.ts << ROUTE
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: Implement list $ENTITY_PLURAL
  return NextResponse.json({ $ENTITY_PLURAL: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // TODO: Implement create $ENTITY
  return NextResponse.json({ id: '1', ...body }, { status: 201 });
}
ROUTE

# Create single item route
cat > app/api/$ENTITY_PLURAL/[id]/route.ts << ROUTE
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement get $ENTITY by id
  return NextResponse.json({ id: params.id });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  // TODO: Implement update $ENTITY
  return NextResponse.json({ id: params.id, ...body });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement delete $ENTITY
  return NextResponse.json({ message: '$ENTITY deleted' });
}
ROUTE

echo "✅ Scaffolded CRUD for $ENTITY at app/api/$ENTITY_PLURAL/"
EOF

# Make all scripts executable
chmod +x ~/.claude/scripts/*.sh
chmod +x ~/.claude/scripts/*.py
chmod +x ~/.claude/scripts/*.ts
chmod +x ~/.claude/scripts/*.js

# Create a command runner for easy access
cat > ~/.claude/scripts/run-automation.sh << 'EOF'
#!/bin/bash
case "$1" in
  test-gen)
    ~/.claude/scripts/auto-test-gen.sh "$2"
    ;;
  doc-gen)
    python3 ~/.claude/scripts/auto-doc.py "$2"
    ;;
  type-gen)
    ts-node ~/.claude/scripts/generate-types.ts "$2"
    ;;
  update-readme)
    node ~/.claude/scripts/update-readme.js
    ;;
  scaffold)
    ~/.claude/scripts/scaffold-crud.sh "$2"
    ;;
  *)
    echo "Usage: run-automation.sh {test-gen|doc-gen|type-gen|update-readme|scaffold} [args]"
    ;;
esac
EOF
chmod +x ~/.claude/scripts/run-automation.sh

echo "✅ All coding automation tools installed!"
echo ""
echo "Available automation commands:"
echo "  ~/.claude/scripts/run-automation.sh test-gen <file>     - Generate test files"
echo "  ~/.claude/scripts/run-automation.sh doc-gen <file>      - Generate documentation"
echo "  ~/.claude/scripts/run-automation.sh type-gen <json>     - Generate TypeScript types"
echo "  ~/.claude/scripts/run-automation.sh update-readme       - Update README.md"
echo "  ~/.claude/scripts/run-automation.sh scaffold <Entity>   - Scaffold CRUD API"