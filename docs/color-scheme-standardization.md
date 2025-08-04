# Color Scheme Standardization

## Status Colors

### Stock Status
- **In Stock/Good**: Green (bg-green-50, text-green-700/800, border-green-200)
- **Low Stock/Warning**: Yellow (bg-yellow-50, text-yellow-700/800, border-yellow-200)
- **Out of Stock/Critical**: Red (bg-red-50, text-red-700/800, border-red-200)
- **Overstocked**: Blue (bg-blue-50, text-blue-700/800, border-blue-200)

### Action States
- **Primary Actions**: Blue (bg-blue-600, hover:bg-blue-700, text-white)
- **Success**: Green (bg-green-100, text-green-800)
- **Warning**: Yellow (bg-yellow-100, text-yellow-800)
- **Error/Danger**: Red (bg-red-100, text-red-800)
- **Info**: Blue (bg-blue-100, text-blue-800)

### UI Elements
- **Page Background**: White (bg-white)
- **Card Background**: White with shadow (bg-white shadow)
- **Table Header**: Gray (bg-gray-50)
- **Hover States**: Gray (hover:bg-gray-50 or hover:bg-gray-100)
- **Borders**: Gray (border-gray-200 or border-gray-300)
- **Disabled**: Gray with opacity (bg-gray-300, opacity-50)

### Text Colors
- **Primary Text**: Gray-900 (text-gray-900)
- **Secondary Text**: Gray-600 (text-gray-600)
- **Muted Text**: Gray-500 (text-gray-500)
- **Links**: Blue (text-blue-600, hover:text-blue-800)

### Special Purpose Colors
- **Money/Financial**: Purple (bg-purple-50, text-purple-700)
- **Analytics/Trends**: Indigo (bg-indigo-50, text-indigo-700)
- **Fast Moving Items**: Blue (bg-blue-50, text-blue-700)
- **Orders**: Various based on status
  - Draft: Gray (bg-gray-100)
  - Submitted: Blue (bg-blue-100)
  - Approved: Green (bg-green-100)

## Implementation Notes

1. Always use consistent color pairs (background + text)
2. Use the 50 variant for backgrounds, 700/800 for text
3. Maintain sufficient contrast for accessibility
4. Use hover states consistently (typically one shade darker)