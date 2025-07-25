/**
 * SERENA ANALYSIS: TypeScript Interface Improvements
 * =================================================
 * 
 * Analysis of current InventoryItem interface reveals opportunities for better type safety,
 * performance, and maintainability.
 */

// CURRENT INTERFACE ISSUES:
// 1. Inconsistent optional/required fields
// 2. Multiple fields for same concept (product_name vs name)
// 3. No validation constraints
// 4. Missing branded types for safety
// 5. No computed field separation

// IMPROVED TYPE DEFINITIONS:

// 1. Branded types for type safety
type InventoryItemId = string & { readonly __brand: unique symbol };
type SKU = string & { readonly __brand: unique symbol };
type StockQuantity = number & { readonly __brand: unique symbol };
type Price = number & { readonly __brand: unique symbol };

// 2. Separate base data from computed fields
interface InventoryItemBase {
  readonly id: InventoryItemId;
  readonly sku: SKU;
  readonly productName: string; // Consolidated from product_name/name
  readonly currentStock: StockQuantity;
  readonly location: string | null;
  readonly minimumStock: StockQuantity;
  readonly maximumStock: StockQuantity | null;
  readonly reorderPoint: StockQuantity;
  readonly reorderQuantity: StockQuantity | null;
  readonly vendor: string | null;
  readonly cost: Price | null;
  readonly unitPrice: Price | null;
  readonly lastUpdated: Date; // Use Date instead of string
}

// 3. Sales data as separate interface
interface InventorySalesData {
  readonly salesLast30Days: number;
  readonly salesLast90Days: number;
  readonly lastSalesUpdate: Date | null;
}

// 4. Computed analytics fields
interface InventoryAnalytics {
  readonly salesVelocity: number; // units per day
  readonly daysUntilStockout: number | null; // null for infinite
  readonly reorderRecommended: boolean;
  readonly stockStatusLevel: StockStatusLevel;
  readonly trend: SalesTrend;
  readonly inventoryValue: Price; // computed: currentStock * (unitPrice || cost)
}

// 5. Strict enums instead of string literals
enum StockStatusLevel {
  CRITICAL = 'critical',
  LOW = 'low',
  ADEQUATE = 'adequate',
  OVERSTOCKED = 'overstocked'
}

enum SalesTrend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable'
}

// 6. Complete inventory item with computed fields
interface InventoryItem extends InventoryItemBase, InventorySalesData, InventoryAnalytics {}

// 7. Improved summary with better typing
interface InventorySummary {
  readonly totalItems: number;
  readonly totalInventoryValue: Price;
  readonly outOfStockCount: number;
  readonly lowStockCount: number;
  readonly criticalReorderCount: number;
  readonly overstockedCount: number;
  readonly averageSalesVelocity: number;
  readonly lastUpdated: Date;
}

// 8. Filter configuration with better constraints
interface FilterConfig {
  readonly status: StockStatusLevel | 'all' | 'in-stock' | 'out-of-stock';
  readonly vendor: string;
  readonly location: string;
  readonly priceRange: {
    readonly min: Price;
    readonly max: Price;
  };
  readonly salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead';
  readonly stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180';
  readonly reorderNeeded: boolean;
  readonly hasValue: boolean;
}

// 9. Type guards for runtime validation
function isValidStockQuantity(value: number): value is StockQuantity {
  return Number.isInteger(value) && value >= 0;
}

function isValidPrice(value: number): value is Price {
  return Number.isFinite(value) && value >= 0;
}

function isValidSKU(value: string): value is SKU {
  return /^[A-Z0-9\-_]{3,20}$/i.test(value);
}

// 10. Factory functions for type safety
function createInventoryItemId(id: string): InventoryItemId {
  if (!id || id.length === 0) {
    throw new Error('Invalid inventory item ID');
  }
  return id as InventoryItemId;
}

function createSKU(sku: string): SKU {
  if (!isValidSKU(sku)) {
    throw new Error(`Invalid SKU format: ${sku}`);
  }
  return sku as SKU;
}

function createStockQuantity(quantity: number): StockQuantity {
  if (!isValidStockQuantity(quantity)) {
    throw new Error(`Invalid stock quantity: ${quantity}`);
  }
  return quantity as StockQuantity;
}

function createPrice(price: number): Price {
  if (!isValidPrice(price)) {
    throw new Error(`Invalid price: ${price}`);
  }
  return price as Price;
}

// 11. Utility types for operations
type InventoryItemUpdate = Partial<
  Pick<InventoryItemBase, 'currentStock' | 'cost' | 'unitPrice' | 'location'>
>;

type InventoryItemCreate = Omit<InventoryItemBase, 'id' | 'lastUpdated'> & {
  readonly id?: InventoryItemId; // Optional for auto-generation
};

// 12. API response types
interface InventoryApiResponse<T = InventoryItem[]> {
  readonly success: boolean;
  readonly data: T;
  readonly total?: number;
  readonly page?: number;
  readonly limit?: number;
  readonly timestamp: Date;
  readonly error?: string;
}

/**
 * TYPE SAFETY IMPROVEMENTS SUMMARY:
 * =================================
 * 
 * 1. Branded Types: Prevent mixing of incompatible values (IDs, SKUs, quantities)
 * 2. Readonly Properties: Immutable data structures for better predictability
 * 3. Strict Enums: Replace string literals with type-safe enums
 * 4. Separated Concerns: Base data vs computed analytics vs sales data
 * 5. Runtime Validation: Type guards and factory functions
 * 6. Better Null Handling: Explicit null vs undefined usage
 * 7. Date Objects: Use Date instead of string for timestamps
 * 8. Utility Types: Focused types for specific operations
 * 9. API Response Types: Consistent API response structure
 * 10. Documentation: Clear interfaces with JSDoc comments
 * 
 * BENEFITS:
 * - Compile-time error catching
 * - Better IDE intellisense and autocomplete
 * - Reduced runtime errors
 * - Clearer data flow and dependencies
 * - Easier refactoring and maintenance
 */
