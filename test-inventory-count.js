// Simple test to check inventory loading
// Test direct API call
fetch('/api/inventory')
  .then(response => response.json())
  .then(data => {
  })
  .catch(error => console.error('API Error:', error));

// Test direct Supabase query simulation