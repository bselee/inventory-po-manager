# Vendors Page - Complete Feature Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [User Interface Components](#user-interface-components)
4. [View Modes](#view-modes)
5. [Search & Filtering](#search--filtering)
6. [Vendor Statistics](#vendor-statistics)
7. [Cross-Page Integration](#cross-page-integration)
8. [API Endpoints](#api-endpoints)
9. [Recent Updates](#recent-updates)

## Overview

The Vendors Page provides comprehensive vendor management capabilities with real-time statistics, multiple view modes, and seamless integration with inventory management.

**Page Location**: `/app/vendors/page.tsx`  
**Primary Components**: 
- `VendorsPageContent` (main content component)
- `EnhancedVendorCard` (card view component)
- `VendorListView` (list view component)

## Core Features

### 1. **Vendor Management**
- View all vendors with contact information
- Real-time vendor statistics and analytics
- Add new vendors with complete details
- Edit existing vendor information
- Vendor synchronization with Finale

### 2. **Dual View Modes**
- **Card View**: Visual grid layout with rich information cards
- **List View**: Compact table format for efficient scanning
- View preference persistence using localStorage
- Smooth transitions between views

### 3. **Real-time Statistics**
Each vendor displays:
- Total inventory items
- Purchase order count and total spend
- Average order value
- Last order date
- Order status breakdown (draft/submitted/approved)
- Inventory health metrics (low stock, out of stock, fast moving)

## User Interface Components

### Header Section
```
[Vendors Title] [X of Y vendors]    [Add Vendor] [Refresh]
```

### Search Bar
- Full-text search across vendor name, contact, and email
- Clear button (X) for quick reset
- Real-time result count display
- Search highlighting in results

### View Mode Toggle
```
[Cards | List]
```
- Persistent selection saved to localStorage
- Visual indication of active mode
- Smooth transition animations

## View Modes

### Card View
Each vendor card displays:
- **Header**: Vendor name and active status
- **Contact Information**: 
  - Contact person name
  - Email (clickable)
  - Phone number
  - Physical address
- **Statistics Panel**:
  - Total items supplied
  - Purchase order metrics
  - Inventory value
  - Stock health indicators
- **Action Buttons**: Edit, View Details

### List View
Tabular format with columns:
- Vendor Name
- Contact Person
- Email
- Phone
- Total Items
- Total Orders
- Last Order Date
- Actions (Edit/View)

## Search & Filtering

### Search Implementation
```typescript
const filteredVendors = vendors.filter(vendor => 
  vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (vendor.contact_name && vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
)
```

### URL Parameter Support
- Accepts `?vendor=VendorName` parameter
- Auto-scrolls to matching vendor
- Highlights vendor card for 3 seconds
- Integrates with inventory page navigation

## Vendor Statistics

### Real-time Metrics
```typescript
interface VendorStats {
  vendor: Vendor
  totalItems: number
  totalPurchaseOrders: number
  totalSpend: number
  averageOrderValue: number
  lastOrderDate: string | null
  ordersByStatus: {
    draft: number
    submitted: number
    approved: number
  }
  inventoryStats: {
    totalValue: number
    lowStockItems: number
    outOfStockItems: number
    fastMovingItems: number
    inStockItems: number
  }
}
```

### Loading Strategy
- Statistics loaded asynchronously per vendor
- Individual loading states prevent UI blocking
- Cached for session duration
- Refresh clears cache for fresh data

## Cross-Page Integration

### From Inventory Page
1. User clicks vendor name in inventory table
2. Opens `/vendors?vendor=VendorName`
3. Vendor page loads and auto-scrolls to vendor
4. Vendor card highlights temporarily
5. User can view all products from that vendor

### To Inventory Page
- Vendor cards can link to filtered inventory views
- Shows all items from specific vendor
- Maintains navigation context

## API Endpoints

### Vendor Management
```typescript
// Get all vendors
GET /api/vendors

// Get vendor statistics
GET /api/vendors/{id}/stats

// Create new vendor
POST /api/vendors
Body: { name, contact_name, email, phone, address, notes }

// Update vendor
PUT /api/vendors/{id}
Body: { ...vendor fields }

// Get vendor by ID
GET /api/vendors/{id}
```

### Statistics Calculation
The `/api/vendors/{id}/stats` endpoint aggregates:
- Inventory items count by vendor name
- Purchase order history and totals
- Stock level analysis
- Sales velocity for vendor items

## Recent Updates

### December 2024 Updates

#### 1. **React 18+ Compliance**
- Added proper Suspense boundaries
- Implemented Error boundaries with fallback UI
- Split component for `useSearchParams()` compatibility

#### 2. **Enhanced UI/UX**
- **View Mode Toggle**: Card/List view with persistence
- **Search Improvements**:
  - Clear button for quick reset
  - Result count display
  - Better empty states
- **Loading States**: Skeleton loaders for better perceived performance

#### 3. **Error Handling**
```typescript
<ErrorBoundary fallback={PageErrorFallback}>
  <Suspense fallback={<VendorsLoadingFallback />}>
    <VendorsPageContent />
  </Suspense>
</ErrorBoundary>
```

#### 4. **Performance Optimizations**
- Parallel statistics loading
- Individual vendor stat caching
- Optimized re-renders with proper React patterns

## Best Practices

### Adding New Vendors
1. Click "Add Vendor" button
2. Fill required fields (name is mandatory)
3. System attempts Finale sync if configured
4. Shows sync status after creation

### Editing Vendors
1. Click vendor card or edit button
2. Modify contact information
3. Changes sync to Finale if integration enabled
4. Local-only updates if Finale unavailable

### Performance Tips
- Use list view for large vendor counts
- Search to filter before scrolling
- Refresh only when needed (clears cache)

## Future Enhancements

### Planned Features
1. **Advanced Filtering**
   - Filter by order count ranges
   - Filter by last order date
   - Filter by stock health metrics

2. **Bulk Operations**
   - Multi-select vendors
   - Bulk status updates
   - Export vendor list

3. **Analytics Dashboard**
   - Vendor performance trends
   - Comparative analytics
   - Automated vendor scoring

4. **Enhanced Integration**
   - Direct purchase order creation
   - Vendor portal access
   - Document management