// Test script to debug hide functionality
console.log('🔍 Debugging Hide Functionality...');

// Check current filter state
const showHiddenCheckbox = document.getElementById('showHidden');
if (showHiddenCheckbox) {
  console.log(`Show Hidden Items checkbox: ${showHiddenCheckbox.checked ? 'CHECKED' : 'UNCHECKED'}`);
} else {
  console.log('❌ Show Hidden Items checkbox not found');
}

// Count visible items
const tableRows = document.querySelectorAll('table tbody tr');
console.log(`Current visible items in table: ${tableRows.length}`);

// Check for hidden items styling
const hiddenItems = Array.from(tableRows).filter(row => 
  row.classList.contains('bg-gray-100') || row.classList.contains('text-gray-500')
);
console.log(`Items with "hidden" styling: ${hiddenItems.length}`);

// Check for eye icons
const eyeButtons = document.querySelectorAll('[title*="Hide"], [title*="Show"]');
console.log(`Eye buttons found: ${eyeButtons.length}`);

// Test click on first eye button if available
if (eyeButtons.length > 0) {
  console.log('Testing first eye button click...');
  const beforeRowCount = tableRows.length;
  eyeButtons[0].click();
  
  setTimeout(() => {
    const afterRows = document.querySelectorAll('table tbody tr');
    console.log(`Row count after click: ${beforeRowCount} → ${afterRows.length}`);
    
    const showHiddenAfter = document.getElementById('showHidden');
    if (showHiddenAfter) {
      console.log(`Show Hidden checkbox after click: ${showHiddenAfter.checked ? 'CHECKED' : 'UNCHECKED'}`);
    }
  }, 1000);
}

console.log('Hide functionality debug completed.');
