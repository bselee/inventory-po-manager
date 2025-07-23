# Vercel Deployment Guide

## 🚀 Automatic Deployment (Recommended)

The application auto-deploys to Vercel when you push to the main branch.

### Check Deployment Status

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project
3. Check the "Deployments" tab for recent deployments

## 📝 Environment Variables Setup

Required environment variables in Vercel:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_postgresql_connection_string

# Finale Integration
FINALE_API_KEY=your_finale_api_key
FINALE_API_SECRET=your_finale_api_secret
FINALE_ACCOUNT_PATH=your_account_path

# Email (Optional)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourcompany.com
```

### Setting Environment Variables

1. Go to Project Settings → Environment Variables
2. Add each variable for Production, Preview, and Development
3. Click "Save"

## 🔧 Manual Deployment Options

### Option 1: Redeploy from Dashboard

1. Go to your project in Vercel Dashboard
2. Click "Redeploy" on the latest deployment
3. Select "Production" environment

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## 🏗️ Build Configuration

The project uses these build settings:

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

## � Troubleshooting

### Build Failures

- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure TypeScript compilation passes locally

### Runtime Errors

- Check Function Logs in Vercel dashboard
- Verify database connection
- Test API endpoints individually

### Database Connection Issues

- Ensure `DATABASE_URL` is correctly formatted
- Check Supabase service role key permissions
- Verify Row Level Security policies

## 📊 Monitoring

### Health Checks

The application includes built-in health checks:

- `/api/health` - Basic application health
- `/api/sync-finale/test` - Finale API connectivity
- Database connectivity validation

### Performance Monitoring

- Use Vercel Analytics for performance insights
- Monitor API response times
- Track database query performance
GOOGLE_CLIENT_SECRET=[Your Google OAuth Secret]
ENCRYPTION_KEY=[Generate with: openssl rand -hex 32]
OPENAI_API_KEY=[Your OpenAI API Key]
```

3. Click "Save" for each variable
4. Redeploy to apply new environment variables

## ✅ Verify Deployment Success

### 1. Build Logs
- Check for successful build completion
- Look for "Ready" status
- Verify no error messages

### 2. Function Logs
- Go to Functions tab in Vercel
- Check for any runtime errors
- Monitor API routes

### 3. Test Critical Paths
```bash
# Test API health
curl https://your-app.vercel.app/api/test

# Test auth setup
curl https://your-app.vercel.app/api/auth/check-setup

# Test integration status
curl https://your-app.vercel.app/api/integrations/status
```

### 4. Application Testing
1. Visit your production URL
2. Test Google OAuth login
3. Configure Finale settings and verify persistence
4. Test Bill.com configuration

## 🔍 Troubleshooting

### "Page not found" errors
- Ensure all routes are properly exported
- Check for case sensitivity issues

### "500 Internal Server Error"
- Check Function logs in Vercel
- Verify all environment variables are set
- Check Supabase connection

### "Authentication failed"
- Verify Google OAuth redirect URIs include production URL
- Check NEXTAUTH_URL matches your domain
- Ensure NEXTAUTH_SECRET is set

### Build failures
- Check build logs for missing dependencies
- Verify all environment variables
- Try `npm run build` locally first

## 📊 Expected Production Metrics
- Build time: 2-4 minutes
- Cold start: <500ms
- API response time: <200ms
- Initial load: <3s

## 🎉 Success Indicators
- ✅ Green "Ready" status in Vercel
- ✅ No errors in Function logs
- ✅ Authentication works smoothly
- ✅ Settings persist after refresh
- ✅ All integrations show proper status