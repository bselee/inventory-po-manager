# BuildASoil Inventory & Purchase Order Manager

Enterprise-grade inventory management system with intelligent purchase order automation, real-time analytics, and seamless Finale Inventory integration.

## ✨ Key Features

### 📊 **Intelligent Inventory Management**

- **Real-time stock tracking** with automated alerts
- **Sales velocity analysis** - identify fast/slow/dead stock
- **Predictive reorder recommendations** based on sales trends
- **Multi-view dashboards**: Table, Planning (30/60/90 day), Analytics
- **Advanced filtering** by status, vendor, location, sales velocity

### 🛒 **Smart Purchase Order System**

- **Automated PO generation** from critical stock levels
- **Two-way Finale sync** - create and track POs in both systems
- **Vendor management** with contact integration
- **Status tracking** (draft → sent → received)
- **Email PO delivery** to vendors

### 🔄 **Finale Inventory Integration**

- **Multiple sync strategies** (full, inventory-only, critical items, smart)
- **Optimized performance** - inventory sync in under 10 seconds
- **Automatic retry logic** with comprehensive error handling
- **Real-time sync monitoring** and health checks

### 🎯 **Business Intelligence**

- **Days-until-stockout calculations** with trend analysis
- **Stock status classification** (critical/low/adequate/overstocked)
- **Sales trend tracking** (increasing/stable/decreasing)
- **Inventory valuation** and dead stock alerts
- **Predictive analytics** for optimal ordering

### 🧪 **Advanced Testing**

- **Creative Playwright testing** for business logic validation
- **Cross-browser consistency** testing
- **Performance monitoring** and accessibility auditing
- **Component state exploration** for UI resilience

## 🚀 Quick Start

1. **Clone & Install**

   ```bash
   git clone <repository>
   cd inventory-po-manager
   npm install
   ```

2. **Database Setup**
   - Follow `/docs/database-migration-guide.md`
   - Run migrations in Supabase SQL Editor

3. **Configure Environment**
   - Set up environment variables in Vercel
   - Configure Finale API credentials

4. **Deploy**
   - Auto-deploys to Vercel on push to main branch

## 📁 Project Structure

```text
app/
├── inventory/          # Main inventory management interface
├── purchase-orders/    # PO management system
├── settings/          # Configuration and sync controls
├── api/               # Backend API routes
└── lib/               # Core business logic and integrations

tests/
├── creative/          # Business intelligence testing
├── e2e/              # End-to-end testing
└── unit/             # Unit tests

docs/                  # Documentation
scripts/              # Database migrations and utilities
```

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Vercel serverless functions
- **Testing**: Playwright (creative patterns), Jest (unit tests)
- **Integration**: Finale Inventory API, Email notifications
- **Deployment**: Vercel with automated CI/CD

## 📖 Documentation

- [Database Migration Guide](docs/database-migration-guide.md)
- [Creative Playwright Testing](docs/playwright-creative-guide.md)
- [Deployment Guide](docs/vercel_deployment_guide.md)

## 🎯 Business Value

- **Reduce stockouts** with predictive reordering
- **Optimize inventory costs** through velocity analysis
- **Automate manual processes** with intelligent PO generation
- **Improve accuracy** with two-way system synchronization
- **Save time** with real-time dashboards and alerts