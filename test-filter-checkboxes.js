// Test script to verify filter checkboxes functionality
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
    // Test clicking the checkbox
    const beforeState = checkbox.checked;
    checkbox.click();
    const afterState = checkbox.checked;
    
    if (beforeState !== afterState) {
      // Reset to original state
      checkbox.click();
    } else {
    }
  } else {
  }
});

// Count current inventory items
const tableRows = document.querySelectorAll('table tbody tr');