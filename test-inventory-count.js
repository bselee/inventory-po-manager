// Simple test to check inventory loading
console.log('Starting inventory data test...');

// Test direct API call
fetch('/api/inventory')
  .then(response => response.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Inventory items count:', data.inventory?.length || 0);
    console.log('Total from pagination:', data.pagination?.total || 0);
  })
  .catch(error => console.error('API Error:', error));

// Test direct Supabase query simulation
console.log('Testing direct database access...');
