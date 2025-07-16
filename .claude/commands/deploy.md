# Deploy Command

Force a fresh Vercel deployment when automatic deployments aren't working.

## Usage
```
/deploy [token]
```

## What it does

1. **Checks Git Status**
   - Ensures all commits are pushed to GitHub
   - Warns about uncommitted changes

2. **Verifies Configuration**
   - Checks vercel.json exists
   - Warns about cron jobs that might block Hobby plan deployments

3. **Forces Fresh Deployment**
   - Uses `vercel --prod` to deploy directly
   - Bypasses any webhook or cache issues

4. **Verifies Success**
   - Checks the health endpoint
   - Shows deployment URLs

## Common Issues Fixed

- **Stuck on old commit**: Forces fresh build from latest code
- **Webhook disconnected**: Deploys without relying on GitHub webhook
- **Cron job blocking**: Warns if cron schedule incompatible with Hobby plan
- **Cache issues**: Forces new build instead of redeploying cached version

## Example Output
```
🚀 Vercel Deployment Script
==========================

1. Checking Git Status...
   Current branch: master
   ✅ Local and remote are in sync

2. Checking Vercel Configuration...
   ✅ vercel.json found

3. Deploying to Vercel...
   Production: https://inventory-po-manager.vercel.app

4. Verifying Deployment...
   ✅ Health check passed

🚀 Deployment complete!
```

## When to Use

- Vercel shows old commit after pushing
- GitHub webhook appears disconnected
- Manual deployment needed for testing
- Automatic deployments stopped working

## Requirements

- Vercel CLI installed
- Vercel token (get from: https://vercel.com/account/tokens)
- Git repository with pushed commits