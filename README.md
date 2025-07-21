# BuildASoil Inventory & Purchase Order Manager

A Next.js application for managing inventory levels and automating purchase order creation, integrated with Finale Inventory, Google Sheets, and SendGrid.

## Features

- **Automatic Data Sync**: Fully automated synchronization with Finale Inventory
  - Initial sync runs automatically on first startup
  - Continuous sync based on configured schedule (default: hourly)
  - No manual intervention required - just configure and forget
- Real-time inventory tracking and management
- Automated purchase order generation based on stock levels
- Finale Inventory synchronization with retry logic and error recovery
- Google Sheets import/export
- Email notifications via SendGrid for sync alerts
- Modern React UI with Tailwind CSS
- Comprehensive monitoring dashboard with health checks
- Data integrity validation and duplicate detection

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in Vercel
4. Deploy to Vercel (auto-deploys on push to main)

## Documentation

See the `/docs` directory for detailed documentation.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL)
- Tailwind CSS
- Vercel deployment