// Test script to verify filter checkboxes functionality
console.log('Testing Inventory Filter Checkboxes...');

// Test checkboxes by ID
const checkboxes = [
  { id: 'reorderNeeded', name: 'Reorder Needed' },
  { id: 'hasValue', name: 'Has Inventory Value' },
  { id: 'showHidden', name: 'Show Hidden Items' },
  { id: 'showManufactured', name: 'Show Manufactured Items' },
  { id: 'showPurchased', name: 'Show Purchased Items' }
];

checkboxes.forEach(({ id, name }) => {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    console.log(`✅ ${name}: Found and ${checkbox.checked ? 'checked' : 'unchecked'}`);
    
    // Test clicking the checkbox
    const beforeState = checkbox.checked;
    checkbox.click();
    const afterState = checkbox.checked;
    
    if (beforeState !== afterState) {
      console.log(`✅ ${name}: Click event working (${beforeState} → ${afterState})`);
      // Reset to original state
      checkbox.click();
    } else {
      console.log(`❌ ${name}: Click event not working`);
    }
  } else {
    console.log(`❌ ${name}: Checkbox not found with ID '${id}'`);
  }
});

// Count current inventory items
const tableRows = document.querySelectorAll('table tbody tr');
console.log(`Current inventory table shows ${tableRows.length} items`);

console.log('Filter checkbox test completed.');
