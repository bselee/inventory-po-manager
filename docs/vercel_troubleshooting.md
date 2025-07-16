# Vercel Deployment Troubleshooting Guide

This guide consolidates all known Vercel deployment issues and their solutions.

## Quick Fix: Deployment Not Updating

If your deployment is stuck on an old commit, run:
```bash
./scripts/deploy-vercel.sh YOUR_VERCEL_TOKEN
```

This script will:
1. Check git status and sync
2. Verify Vercel configuration
3. Force a fresh deployment
4. Verify the deployment worked

## Common Build Errors

### 1. TypeScript Errors During Build
**Issue**: TypeScript errors blocking build completion
**Solution**: 
- Build is configured to ignore TypeScript errors with `swcMinify: false`
- Run `npm run emergency:fix` if errors persist
- Check `next.config.js` has `typescript: { ignoreBuildErrors: true }`

### 2. Module Resolution Errors
**Issue**: Cannot find module errors
**Solution**:
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
```

### 3. Environment Variable Issues
**Issue**: Missing environment variables in production
**Solution**:
1. Check all variables are set in Vercel dashboard
2. Use the fallback system in code:
   ```typescript
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.SUPABASE_URL || 
                        fallbackUrls.SUPABASE_URL
   ```
3. Run `npm run validate:env` to check configuration

### 4. OAuth Redirect Issues
**Issue**: OAuth callback fails in production
**Solution**:
- Ensure production URLs in Vercel environment variables
- Update Google OAuth Console with production redirect URLs
- Check Supabase dashboard has correct redirect URLs

### 5. Build Timeout
**Issue**: Build exceeds Vercel's time limit
**Solution**:
- Optimize build by removing unused dependencies
- Use `npm run build` locally first to identify slow steps
- Consider using Vercel's larger build resources

## Deployment Commands

### Quick Fixes
```bash
npm run fix:all          # Run all deployment fixes
npm run fix:env          # Setup environment variables
npm run emergency:fix    # Emergency build fixes
npm run emergency:deploy # Fix, build, and deploy
```

### Deployment Steps
```bash
npm run deploy           # Automated deployment
npm run deploy:preview   # Deploy preview
npm run deploy:production # Deploy to production
```

## Error Patterns & Solutions

### Pattern 1: Environment Variables
```
Error: Missing NEXT_PUBLIC_SUPABASE_URL
```
**Fix**: Add to Vercel environment variables

### Pattern 2: Build Configuration
```
Error: Build optimization failed
```
**Fix**: Disable SWC minification in next.config.js

### Pattern 3: Module Resolution
```
Error: Module not found: Can't resolve '@/...'
```
**Fix**: Check tsconfig.json paths configuration

### Pattern 4: Cookie Handling
```
Error: Cookies can only be modified in Server Components
```
**Fix**: Use server-side cookie handling with proper async headers

### Pattern 5: Auth Errors
```
Error: Invalid authentication credentials
```
**Fix**: Verify OAuth credentials match in all services

### Pattern 6: Redis Connection
```
Error: Redis connection failed
```
**Fix**: Redis is optional; ensure graceful fallback

## Vercel-Specific Settings

### Build & Development Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install --legacy-peer-deps`
- **Node Version**: 20.x

### Environment Variables Required
```
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# OAuth (Required)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# NextAuth (Required)
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET

# Optional Services
OPENAI_API_KEY
REDIS_URL
REDIS_PASSWORD
```

### Function Configuration
- **Max Duration**: Set to 60s for API routes that process emails
- **Memory**: 1024 MB recommended for ML operations

## Debug Commands

```bash
# Check deployment status
vercel

# View build logs
vercel logs

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull
```

## Post-Deployment Verification

1. **Check Authentication**:
   - Visit `/api/auth/check-setup`
   - Try signing in with Google

2. **Verify API Routes**:
   ```bash
   curl https://your-app.vercel.app/api/test
   ```

3. **Check Database Connection**:
   - Visit any page that loads data
   - Check Vercel function logs for errors

4. **Monitor Performance**:
   - Check Vercel Analytics dashboard
   - Monitor function execution times

## Emergency Procedures

If deployment fails completely:

1. **Rollback**:
   ```bash
   vercel rollback
   ```

2. **Check Recent Changes**:
   ```bash
   git log --oneline -10
   ```

3. **Use Agentic Deployment**:
   ```bash
   npm run deploy:fix
   ```

4. **Manual Recovery**:
   - Fork last known good commit
   - Deploy from clean state
   - Incrementally add changes

## Deployment Stuck on Old Commit

**Issue**: Vercel shows successful deployment but uses outdated commit
**Common Causes**:
1. GitHub webhook disconnected
2. Cron job configuration blocking deployment (Hobby plan)
3. Vercel using cached/redeploy instead of fresh build

**Solution**:
```bash
# Quick fix - force fresh deployment
./scripts/deploy-vercel.sh YOUR_VERCEL_TOKEN

# Or manually:
vercel --prod --token YOUR_TOKEN --yes
```

**Prevention**:
1. Ensure GitHub webhook is connected in Vercel Dashboard
2. Use daily cron jobs on Hobby plan (not hourly)
3. Check deployment commit SHA matches your latest:
   ```bash
   # Check local
   git log --oneline -1
   
   # Check what Vercel deployed
   vercel inspect DEPLOYMENT_URL --token YOUR_TOKEN
   ```

## Contact Support

If issues persist:
- Check Vercel Status: https://vercel-status.com
- Review Vercel Docs: https://vercel.com/docs
- Check Supabase Status: https://status.supabase.io/init