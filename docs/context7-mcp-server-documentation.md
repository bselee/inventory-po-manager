# Context7 MCP Server Documentation

## Overview

Context7 is a Model Context Protocol (MCP) server that provides real-time access to up-to-date documentation, code examples, and best practices for popular libraries and frameworks. It acts as your intelligent documentation assistant, ensuring you always have the latest information without leaving your development environment.

## What is Context7?

Context7 is designed to:
- **Provide current documentation** for libraries and frameworks
- **Offer code examples** that work with the latest versions
- **Suggest best practices** based on current standards
- **Explain breaking changes** and migration paths
- **Generate boilerplate code** following latest patterns

## Key Features

### 1. Real-time Documentation Access
- Always up-to-date with latest library versions
- No need to browse multiple documentation sites
- Instant access to API references
- Version-specific information

### 2. Intelligent Code Examples
- Working examples for your specific use case
- Integration patterns for your tech stack
- Common pitfalls and solutions
- Performance optimization tips

### 3. Framework Integration Patterns
- How different libraries work together
- Compatibility matrices
- Recommended combinations
- Architecture patterns

### 4. Migration Assistance
- Breaking change notifications
- Step-by-step migration guides
- Automated code updates
- Deprecation warnings

## Configuration

### VS Code Settings
Context7 is configured in `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "context7": {
      "command": "node",
      "args": [
        "./context7/dist/index.js",
        "--transport",
        "stdio"
      ],
      "cwd": ".",
      "env": {}
    }
  }
}
```

### Usage Pattern
To use Context7, simply add "use context7" to your requests:
```
"How do I implement infinite scrolling in React? use context7"
"Show me the latest Next.js 14 app router patterns. use context7"
"What's the best way to handle forms in React with TypeScript? use context7"
```

## Supported Technologies

### Frontend Frameworks
- **React** (18.x, 19.x)
- **Next.js** (13.x, 14.x, 15.x)
- **Vue.js** (3.x)
- **Angular** (15.x, 16.x, 17.x)
- **Svelte/SvelteKit**
- **Solid.js**
- **Astro**

### State Management
- **Redux Toolkit**
- **Zustand**
- **TanStack Query**
- **Valtio**
- **Jotai**
- **MobX**

### Styling Solutions
- **Tailwind CSS** (3.x)
- **CSS Modules**
- **Styled Components**
- **Emotion**
- **CSS-in-JS patterns**

### Backend Technologies
- **Node.js** patterns
- **Express.js**
- **Fastify**
- **NestJS**
- **Prisma**
- **Drizzle ORM**

### Database Clients
- **Supabase**
- **PostgreSQL**
- **MongoDB**
- **Redis**
- **Elasticsearch**

### Testing Libraries
- **Jest**
- **Playwright**
- **Cypress**
- **Testing Library**
- **Vitest**

### Build Tools
- **Vite**
- **Webpack**
- **Turbopack**
- **ESBuild**
- **SWC**

## Practical Examples for Inventory System

### Example 1: Implementing Virtual Scrolling
```typescript
// Ask: "How to add virtual scrolling to inventory table with 10k+ items? use context7"

// Context7 provides:
1. Latest @tanstack/react-virtual setup
2. Integration with existing table structure
3. Performance optimization tips
4. Accessibility considerations

// Generated code:
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedInventoryTable({ items }) {
  const parentRef = useRef()
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  })
  
  // Full implementation with your specific needs
}
```

### Example 2: Optimizing Supabase Queries
```typescript
// Ask: "Best practices for Supabase pagination with real-time updates? use context7"

// Context7 explains:
1. Latest Supabase pagination patterns
2. Combining with real-time subscriptions
3. Cache management strategies
4. Error handling patterns

// Example implementation:
const { data, count } = await supabase
  .from('inventory_items')
  .select('*', { count: 'exact' })
  .range(start, end)
  .order('name')
  
// With real-time updates
const subscription = supabase
  .channel('inventory_changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'inventory_items' 
  }, handleRealtimeUpdate)
  .subscribe()
```

### Example 3: Modern Form Handling
```typescript
// Ask: "Implement inventory edit form with react-hook-form and zod? use context7"

// Context7 provides latest patterns:
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const inventorySchema = z.object({
  name: z.string().min(1, 'Required'),
  quantity: z.number().positive(),
  cost: z.number().positive(),
  reorderPoint: z.number().optional()
})

function InventoryEditForm({ item, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(inventorySchema),
    defaultValues: item
  })
  
  // Complete implementation with error handling
}
```

### Example 4: Advanced Filtering with Performance
```typescript
// Ask: "Optimize complex filtering for 5000+ inventory items? use context7"

// Context7 suggests:
1. Web Worker implementation
2. Memoization strategies
3. Debouncing patterns
4. Virtual scrolling integration

// Optimized filter implementation:
const useOptimizedFilter = (items, filters) => {
  const filterWorker = useRef()
  
  useEffect(() => {
    filterWorker.current = new Worker(
      new URL('./filter.worker.js', import.meta.url)
    )
    // Worker setup
  }, [])
  
  const filteredItems = useMemo(() => {
    // Efficient filtering logic
  }, [items, filters])
  
  return filteredItems
}
```

## Integration Examples

### 1. Next.js App Router with Server Components
```typescript
// Ask: "Convert inventory page to Next.js server component? use context7"

// Context7 provides:
- Latest App Router patterns
- Data fetching strategies
- Client component boundaries
- Streaming and suspense

// Example structure:
// app/inventory/page.tsx (Server Component)
async function InventoryPage() {
  const items = await getInventoryItems()
  
  return (
    <Suspense fallback={<InventoryLoading />}>
      <InventoryTable items={items} />
    </Suspense>
  )
}

// app/inventory/InventoryTable.tsx (Client Component)
'use client'
function InventoryTable({ items }) {
  // Interactive features
}
```

### 2. TanStack Query Integration
```typescript
// Ask: "Add TanStack Query for inventory data management? use context7"

// Context7 shows:
1. Query setup and configuration
2. Optimistic updates
3. Cache invalidation
4. Background refetching

const useInventoryItems = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventoryItems,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  })
}

const useUpdateInventory = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateInventoryItem,
    onMutate: async (newItem) => {
      // Optimistic update
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory'])
    }
  })
}
```

### 3. Modern Testing Patterns
```typescript
// Ask: "Write Playwright tests for inventory filters? use context7"

// Context7 provides latest Playwright patterns:
import { test, expect } from '@playwright/test'

test.describe('Inventory Filters', () => {
  test('should filter by stock status', async ({ page }) => {
    await page.goto('/inventory')
    
    // Latest page object pattern
    const inventory = new InventoryPage(page)
    await inventory.waitForLoad()
    
    await inventory.filters.selectStatus('critical')
    await expect(inventory.table.rows).toHaveCount(5)
    
    // Advanced assertions
    await expect(inventory.table.firstRow).toContainText('Critical')
  })
})
```

## Advanced Use Cases

### 1. Performance Optimization
```typescript
// Ask: "Optimize inventory page performance with latest React patterns? use context7"

// Context7 analyzes and suggests:
1. React.memo optimization points
2. useMemo/useCallback placement
3. Code splitting strategies
4. Bundle size optimization

// Provides specific implementations:
const MemoizedInventoryRow = memo(InventoryRow, (prev, next) => {
  return prev.item.id === next.item.id && 
         prev.item.quantity === next.item.quantity
})

const filteredItems = useMemo(() => 
  filterItems(items, filters),
  [items, filters]
)
```

### 2. Type Safety Enhancement
```typescript
// Ask: "Improve TypeScript types for inventory system? use context7"

// Context7 suggests:
1. Discriminated unions for status
2. Template literal types
3. Branded types for IDs
4. Const assertions

type InventoryStatus = 
  | { type: 'in-stock'; quantity: number }
  | { type: 'low-stock'; quantity: number; reorderPoint: number }
  | { type: 'out-of-stock'; lastAvailable: Date }

type SKU = string & { __brand: 'SKU' }
type VendorId = string & { __brand: 'VendorId' }
```

### 3. Architecture Patterns
```typescript
// Ask: "Implement repository pattern for inventory? use context7"

// Context7 provides modern implementation:
interface InventoryRepository {
  findAll(filters?: FilterOptions): Promise<InventoryItem[]>
  findById(id: string): Promise<InventoryItem | null>
  update(id: string, data: UpdateData): Promise<InventoryItem>
  bulkUpdate(updates: BulkUpdate[]): Promise<void>
}

class SupabaseInventoryRepository implements InventoryRepository {
  // Implementation with error handling, retries, caching
}

// Dependency injection setup
const InventoryContext = createContext<InventoryRepository>()
```

## Best Practices for Using Context7

### 1. Be Specific
```typescript
// Good: "Implement Supabase real-time for inventory updates with TypeScript"
// Better: "Implement Supabase real-time for inventory updates with TypeScript and error recovery"
```

### 2. Mention Your Stack
```typescript
// Include relevant technologies:
"How to test Next.js API routes with Playwright? use context7"
// Context7 knows you're using Next.js and provides specific examples
```

### 3. Ask for Patterns
```typescript
// Request architectural guidance:
"Best pattern for handling Finale API sync errors? use context7"
// Get industry best practices
```

### 4. Version-Specific Queries
```typescript
// Be explicit about versions when needed:
"Migrate from Next.js 13 pages to 14 app router? use context7"
```

## Common Questions

### Q: How current is the documentation?
A: Context7 updates its knowledge base regularly, typically within days of major releases.

### Q: Can it handle beta/preview features?
A: Yes, Context7 tracks beta and preview features with appropriate warnings.

### Q: Does it work offline?
A: Context7 requires internet connection for the most current information.

### Q: Can it generate entire applications?
A: Context7 focuses on patterns and examples rather than full application generation.

## Troubleshooting

### Context7 Not Responding
```bash
# Check if Context7 is running
ps aux | grep context7

# Restart VS Code MCP servers
# Command Palette > "Reload Window"
```

### Outdated Information
```bash
# Context7 auto-updates, but you can force refresh:
# Restart the Context7 service
# Clear any local caches
```

### Integration Issues
```bash
# Ensure Node.js is available
node --version

# Check Context7 installation
ls -la ./context7/dist/index.js

# Verify MCP is enabled in VS Code
```

## Tips for Maximum Benefit

### 1. Combine with Serena
```typescript
// Use both MCP servers together:
"Serena, analyze the filter logic" // Understand current code
"How to optimize filters with latest React patterns? use context7" // Get modern solution
```

### 2. Learning New Libraries
```typescript
// Before adding a dependency:
"Show me TanStack Table v8 for inventory grid? use context7"
// Get examples specific to your use case
```

### 3. Staying Updated
```typescript
// Regular checks:
"What's new in Next.js 15 for our use case? use context7"
"Any breaking changes in Supabase v2? use context7"
```

### 4. Architecture Decisions
```typescript
// Get guidance on patterns:
"Compare state management options for inventory system? use context7"
// Receive pros/cons for your specific needs
```

## Future Capabilities

### Planned Features
1. **Project-Specific Learning**
   - Learns your codebase patterns
   - Suggests consistent implementations
   - Maintains your style guide

2. **Proactive Updates**
   - Notifies about relevant updates
   - Suggests performance improvements
   - Security patch alerts

3. **Team Knowledge Sharing**
   - Shared documentation snippets
   - Team-specific patterns
   - Internal best practices

4. **AI-Enhanced Examples**
   - Examples tailored to your code style
   - Automatic pattern detection
   - Progressive enhancement suggestions

## Conclusion

Context7 serves as your always-current documentation companion, bridging the gap between rapidly evolving libraries and your development needs. It's particularly valuable for:

- Staying current with best practices
- Learning new libraries efficiently
- Ensuring compatibility
- Maintaining modern patterns
- Reducing documentation search time

By integrating Context7 into your workflow, you ensure that your code follows the latest patterns and leverages the most recent features of your dependencies.