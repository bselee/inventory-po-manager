# Serena MCP Server Documentation

## Overview

Serena is an advanced Model Context Protocol (MCP) server that provides semantic code analysis and intelligent editing capabilities for your codebase. It integrates seamlessly with VS Code and Claude Code to enhance development workflows through deep code understanding and automated refactoring.

## What is Serena?

Serena is a specialized MCP server designed to:
- **Analyze code semantically** rather than just syntactically
- **Understand code relationships** across files and modules
- **Provide intelligent refactoring** suggestions
- **Navigate complex codebases** efficiently
- **Identify patterns and anti-patterns** automatically

## Key Features

### 1. Semantic Code Analysis
- Goes beyond syntax to understand code meaning and intent
- Tracks variable usage across scopes and files
- Understands type relationships and inheritance
- Identifies dead code and unused exports
- Maps function call graphs and dependencies

### 2. Intelligent Refactoring
- **Safe Rename**: Rename variables, functions, classes across entire codebase
- **Extract Function**: Pull out code into reusable functions
- **Inline Variable**: Replace variable references with their values
- **Move Function**: Relocate functions between modules with import updates
- **Convert Patterns**: Transform code patterns (callbacks to async/await, etc.)

### 3. Code Navigation
- **Find All References**: Locate all usages of a symbol
- **Go to Definition**: Jump to where something is defined
- **Find Implementations**: See all implementations of an interface
- **Call Hierarchy**: Visualize function call chains
- **Import Graph**: Understand module dependencies

### 4. Pattern Recognition
- Identifies common patterns:
  - Singleton implementations
  - Factory patterns
  - Observer patterns
  - Repository patterns
- Detects anti-patterns:
  - Circular dependencies
  - God objects
  - Tight coupling
  - Code duplication

## Configuration

### VS Code Settings
The Serena MCP server is configured in `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from", 
        "git+https://github.com/oraios/serena", 
        "serena-mcp-server",
        "--project", 
        ".",
        "--transport",
        "stdio"
      ],
      "cwd": ".",
      "env": {}
    }
  }
}
```

### Configuration Options
- `--project`: Root directory of the project to analyze
- `--transport`: Communication protocol (stdio recommended)
- `--include`: File patterns to include (default: all supported files)
- `--exclude`: File patterns to exclude (default: node_modules, dist, etc.)
- `--max-depth`: Maximum directory depth to traverse
- `--cache`: Enable/disable analysis caching

## Usage in This Project

### For Inventory Management System

#### 1. **Analyzing Business Logic**
```typescript
// Ask Serena: "Find all calculations related to sales velocity"
// Serena will identify:
- salesVelocity calculations in useInventoryTableManager
- Dependencies on sales_last_30_days fields
- Components using velocity data
- API endpoints providing sales data
```

#### 2. **Refactoring Inventory Calculations**
```typescript
// Ask Serena: "Extract inventory status calculations into a utility"
// Serena can:
1. Identify all stock status logic
2. Extract to lib/inventory-calculations.ts
3. Update all imports automatically
4. Ensure type safety is maintained
```

#### 3. **Finding API Dependencies**
```typescript
// Ask Serena: "Show me all API calls related to Finale sync"
// Serena maps:
- All routes calling Finale API
- Error handling patterns
- Retry logic implementations
- Data transformation functions
```

#### 4. **Optimizing Component Structure**
```typescript
// Ask Serena: "Identify duplicate filter logic"
// Serena finds:
- Multiple implementations of filtering
- Suggests consolidation points
- Shows impact of changes
- Recommends shared hook usage
```

## Practical Examples

### Example 1: Refactoring Filter System
```typescript
// Current: Multiple filter implementations
// Ask Serena: "Consolidate all inventory filtering logic"

// Serena identifies:
1. useInventoryTableManager filtering
2. useEnhancedInventoryFiltering
3. useOptimizedInventoryFilter
4. Inline filter logic in components

// Serena suggests:
- Create unified useInventoryFilters hook
- Migrate all components to use it
- Remove redundant implementations
- Update tests accordingly
```

### Example 2: Analyzing Performance Bottlenecks
```typescript
// Ask Serena: "Find expensive operations in inventory page"

// Serena analyzes:
1. Calculations inside render loops
2. Missing memoization opportunities
3. Unnecessary re-renders
4. Large data transformations

// Provides specific optimization points:
- Line 234: Move calculation outside map()
- Line 456: Add useMemo for filtered items
- Line 789: Debounce search input
```

### Example 3: Understanding Data Flow
```typescript
// Ask Serena: "Trace data flow from Finale sync to UI"

// Serena maps:
1. /api/sync-finale/route.ts fetches data
2. Data stored in Supabase via upsert
3. /api/inventory/route.ts queries database
4. useInventoryTableManager processes data
5. EnhancedInventoryTable renders results

// Shows all transformation points and types
```

## Advanced Features

### 1. **Cross-File Refactoring**
```typescript
// Rename a type used across 50+ files
// Serena handles:
- Type definitions
- Import statements
- Usage in functions
- JSDoc comments
- Test files
```

### 2. **Dependency Analysis**
```typescript
// Ask: "What would break if I change this API response?"
// Serena traces:
- Direct consumers
- Type dependencies
- Test expectations
- UI components affected
```

### 3. **Code Quality Metrics**
```typescript
// Ask: "Analyze code quality of inventory module"
// Serena reports:
- Cyclomatic complexity
- Code duplication
- Test coverage gaps
- Type safety issues
- Performance concerns
```

### 4. **Migration Assistance**
```typescript
// Ask: "Help migrate from direct Supabase to API layer"
// Serena:
1. Finds all direct Supabase calls
2. Suggests API endpoint structure
3. Generates migration plan
4. Updates code incrementally
```

## Best Practices

### 1. **Use Specific Queries**
```typescript
// Good: "Find all places where inventory cost is calculated"
// Better: "Find cost calculations in inventory module excluding tests"
```

### 2. **Leverage Pattern Recognition**
```typescript
// "Identify all singleton patterns in the codebase"
// "Find potential memory leaks in event handlers"
// "Show me all try-catch blocks without proper error handling"
```

### 3. **Incremental Refactoring**
```typescript
// Start small:
1. "Extract this calculation to a function"
2. "Now make it generic for all item types"
3. "Move to shared utilities"
4. "Update all usages"
```

### 4. **Verify Changes**
```typescript
// After refactoring:
"Show me all files affected by the refactor"
"Verify no type errors were introduced"
"Check if all tests still pass"
```

## Integration with Development Workflow

### 1. **Code Review Preparation**
- Use Serena to identify complex functions before review
- Find potential issues proactively
- Ensure consistent patterns

### 2. **Feature Development**
- Understand existing patterns before adding features
- Find similar implementations to maintain consistency
- Identify reusable components

### 3. **Bug Investigation**
- Trace data flow leading to bugs
- Find all code paths to problematic area
- Identify missing error handling

### 4. **Performance Optimization**
- Find expensive operations
- Identify rendering bottlenecks
- Locate missing optimizations

## Troubleshooting

### Common Issues

#### 1. **Serena Not Starting**
```bash
# Check if uvx is installed
which uvx

# Install if missing
pip install uv

# Verify MCP is enabled in VS Code
# Check settings.json for proper configuration
```

#### 2. **Slow Analysis**
```bash
# Large codebases may take time on first run
# Serena caches analysis results
# Exclude unnecessary directories:
"--exclude" "node_modules,dist,build,.next"
```

#### 3. **Missing Features**
```bash
# Ensure latest version
uvx --from git+https://github.com/oraios/serena@latest serena-mcp-server
```

#### 4. **Memory Issues**
```bash
# For large projects, increase memory
NODE_OPTIONS="--max-old-space-size=4096" code
```

## Performance Tips

### 1. **Optimize Queries**
- Be specific about file patterns
- Use exclusion patterns for faster analysis
- Leverage cached results when possible

### 2. **Incremental Analysis**
- Analyze modules separately
- Build up understanding gradually
- Cache results between sessions

### 3. **Selective Usage**
- Use for complex refactoring
- Apply to critical code paths
- Focus on high-impact areas

## Future Capabilities

### Planned Features
1. **AI-Powered Suggestions**
   - Machine learning for pattern recognition
   - Automated refactoring suggestions
   - Code quality predictions

2. **Real-time Analysis**
   - Continuous background analysis
   - Instant feedback on changes
   - Live code quality metrics

3. **Team Collaboration**
   - Shared analysis results
   - Collective code intelligence
   - Pattern library building

4. **Custom Rules**
   - Project-specific patterns
   - Company coding standards
   - Domain-specific analysis

## Conclusion

Serena MCP Server transforms how you interact with your codebase by providing deep semantic understanding and intelligent automation. It's particularly powerful for:

- Large-scale refactoring
- Code quality improvement
- Pattern consistency
- Performance optimization
- Knowledge discovery

By integrating Serena into your workflow, you can navigate and modify code with confidence, knowing that all dependencies and relationships are properly handled.