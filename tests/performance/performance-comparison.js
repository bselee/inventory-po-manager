/**
 * Performance comparison between optimized and naive implementations
 */

// Naive implementation for comparison
function naiveFilter(items, searchTerm, filterConfig, sortConfig) {
  let filtered = [...items];
  
  // Search
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filtered = filtered.filter(item => {
      const searchableText = [
        item.sku || '',
        item.product_name || '',
        item.name || '',
        item.vendor || '',
        item.location || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(search);
    });
  }
  
  // Status filter
  if (filterConfig.status !== 'all') {
    filtered = filtered.filter(item => {
      switch (filterConfig.status) {
        case 'out-of-stock':
          return item.current_stock === 0;
        case 'critical':
          return item.stock_status_level === 'critical';
        case 'low':
          return item.stock_status_level === 'low';
        case 'in-stock':
          return item.current_stock > 0;
        default:
          return true;
      }
    });
  }
  
  // Vendor filter
  if (filterConfig.vendor) {
    filtered = filtered.filter(item => item.vendor === filterConfig.vendor);
  }
  
  // Location filter
  if (filterConfig.location) {
    filtered = filtered.filter(item => item.location === filterConfig.location);
  }
  
  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return filtered;
}

// Generate test data
function generateItems(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    sku: `SKU-${i.toString().padStart(6, '0')}`,
    product_name: `Product ${i}`,
    name: `Product ${i}`,
    current_stock: Math.floor(Math.random() * 1000),
    vendor: ['Vendor A', 'Vendor B', 'Vendor C'][i % 3],
    location: ['Warehouse 1', 'Warehouse 2'][i % 2],
    unit_price: Math.random() * 100,
    sales_velocity: Math.random() * 5,
    stock_status_level: ['critical', 'low', 'adequate'][i % 3]
  }));
}

// Performance test
function runComparison() {
  const testCases = [
    { size: 100, iterations: 1000 },
    { size: 1000, iterations: 100 },
    { size: 5000, iterations: 20 },
    { size: 10000, iterations: 10 }
  ];
  
  const filterConfig = {
    status: 'critical',
    vendor: 'Vendor A',
    location: 'Warehouse 1'
  };
  
  const sortConfig = {
    key: 'sales_velocity',
    direction: 'desc'
  };
  
  testCases.forEach(({ size, iterations }) => {
    const items = generateItems(size);
    
    // Test naive implementation
    const naiveTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      naiveFilter(items, 'Product 5', filterConfig, sortConfig);
      naiveTimes.push(performance.now() - start);
    }
    
    const naiveAvg = naiveTimes.reduce((a, b) => a + b) / naiveTimes.length;
  });
}

// Run if executed directly
if (require.main === module) {
  runComparison();
}

module.exports = { naiveFilter, runComparison };