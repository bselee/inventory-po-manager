// Test script to debug hide functionality
// Check current filter state
const showHiddenCheckbox = document.getElementById('showHidden');
if (showHiddenCheckbox) {
} else {
}

// Count visible items
const tableRows = document.querySelectorAll('table tbody tr');
// Check for hidden items styling
const hiddenItems = Array.from(tableRows).filter(row => 
  row.classList.contains('bg-gray-100') || row.classList.contains('text-gray-500')
);
// Check for eye icons
const eyeButtons = document.querySelectorAll('[title*="Hide"], [title*="Show"]');
// Test click on first eye button if available
if (eyeButtons.length > 0) {
  const beforeRowCount = tableRows.length;
  eyeButtons[0].click();
  
  setTimeout(() => {
    const afterRows = document.querySelectorAll('table tbody tr');
    const showHiddenAfter = document.getElementById('showHidden');
    if (showHiddenAfter) {
    }
  }, 1000);
}