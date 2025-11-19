# Vercel Deployment Guide - Millan Luxury Cleaning

This guide explains how to deploy your Millan Luxury Cleaning website to Vercel.

## ⚠️ Build Configuration

### Path Normalization Fix

**Issue:** Vercel was corrupting the "client" path to "cline" due to Windows-style path normalization.

**Solution Applied:**
- ✅ Created `build-vercel.sh` wrapper script
- ✅ Updated `vercel.json` to use modern configuration format (buildCommand + outputDirectory)
- ✅ This avoids the "@vercel/static-build" path normalization issue

### Node.js Version Requirement

**Required:** Node.js 22+ (for `import.meta.dirname` support)

**Configure in Vercel Dashboard:**
1. Settings → General → Node.js Version
2. Select **22.x** from dropdown
3. Save and redeploy

**Verification:**
Check build logs to confirm "Node.js 22.x" at the start of the build process.

## ⚠️ Important Notes

### Authentication System
Your current app uses **Replit Auth** which will NOT work on Vercel. Before deploying, you need to:

**Option 1: Remove Authentication** (Simplest for marketing site)
- Remove all admin/CMS features that require authentication
- Make the site public-facing only
- Remove: `/api/auth/*`, `/admin` route, authentication middleware

**Option 2: Replace with Alternative Auth**
- Use **Vercel Auth** or **Auth0** or **Clerk**
- Update `server/replitAuth.ts` with new auth provider
- Configure environment variables for new auth system

### Database
✅ Your PostgreSQL database (Neon) works perfectly with Vercel!

## Pre-Deployment Checklist

### 1. Environment Variables
You need to add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database (Required)
DATABASE_URL=your_neon_database_connection_string

# Session Secret (Required)
SESSION_SECRET=your_random_secret_key_here

# Vercel Blob Storage (Required for gallery images)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXX

# If using Replit Auth (won't work on Vercel - replace or remove)
# REPLIT_DEPLOYMENT=1
# ISSUER_URL=...

# Production URLs
NODE_ENV=production
```

#### Getting BLOB_READ_WRITE_TOKEN:

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Blob**
4. Name your blob store (e.g., "millan-gallery-images")
5. Copy the `BLOB_READ_WRITE_TOKEN` from the environment variables
6. Paste it into your project's Environment Variables section

**Note:** File uploads will only work on Vercel with BLOB_READ_WRITE_TOKEN configured. Local development won't support file uploads unless you add the token to your local environment.

## ⚠️ CRITICAL: Authentication Required Before Production

**THE UPLOAD ENDPOINT HAS NO AUTHENTICATION!**

The `/api/upload` endpoint currently has **no authentication** because Replit Auth won't work on Vercel. This means anyone can upload files to your Blob storage.

**Before deploying to production, you MUST:**

1. Choose an auth provider that works on Vercel:
   - **Clerk** (recommended) - Easy to set up, works great with Vercel
   - **Auth0** - Enterprise-grade authentication
   - **NextAuth.js** - Open source, self-hosted option

2. Implement authentication for:
   - `/api/upload` - File uploads
   - `/api/gallery/*` - Gallery management (POST, PATCH, DELETE)
   - `/api/testimonials/*` - Testimonial management
   - `/api/services/*` - Service management
   - All other admin endpoints

3. Verify only authenticated admin users can access these endpoints

**Current State:**
- Authentication works on Replit (uses Replit Auth)
- Authentication **WILL NOT WORK** on Vercel
- Upload endpoint is currently **UNPROTECTED**

### 2. Update Package.json Scripts

The `vercel-build` script is already configured:

```json
{
  "scripts": {
    "vercel-build": "vite build"
  }
}
```

### 3. File Structure for Vercel

```
your-project/
├── api/
│   └── index.js          # Serverless function entry (needs work)
├── dist/                 # Build output (generated)
│   ├── public/          # Frontend static files
│   └── index.js         # Backend bundle
├── client/              # React frontend source
├── server/              # Express backend source
├── vercel.json          # Vercel configuration ✅
├── .vercelignore        # Files to exclude ✅
└── package.json
```

## Deployment Steps

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Push code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to https://vercel.com/new
   - Import your repository
   - Framework: Detected automatically (Vite)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist/public`

3. **Add Environment Variables**
   - Settings → Environment Variables
   - Add DATABASE_URL, SESSION_SECRET, etc.

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Current Limitations & Required Changes

### 🚨 Critical Issues to Fix

1. **Authentication System**
   - `server/replitAuth.ts` uses Replit-specific OAuth
   - Must be replaced or removed before deployment
   - Routes using `isAuthenticated` middleware will fail

2. **API Routes**
   - Current `api/index.js` is a placeholder
   - Needs proper Express app export for serverless
   - Consider converting to Vercel Serverless Functions format

3. **File Uploads**
   - Current gallery images may be stored locally
   - Need cloud storage (Vercel Blob, Cloudinary, or S3)

### Recommended Architecture Changes

#### For Static Marketing Site (No Admin/CMS):

```
Vercel Hosting
├── Frontend: React/Vite (Static)
└── Backend: Contact form only (Serverless Function)
    └── Saves to database
```

#### For Full-Stack with CMS:

```
Vercel Hosting
├── Frontend: React/Vite (Static)
├── Auth: Clerk/Auth0 (Replaces Replit Auth)
└── Backend: Express (Serverless Functions)
    ├── Protected admin routes
    └── Database CRUD operations
```

## Simplified Deployment (Static Site Only)

If you want to deploy ASAP without backend:

1. **Remove backend code**
   - Delete admin routes
   - Make content static or use CMS API
   
2. **Update vercel.json**:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

3. **Deploy**
   - Just the frontend builds
   - No serverless functions needed

## Post-Deployment

### Testing Checklist
- [ ] Homepage loads correctly
- [ ] All sections visible (Hero, Services, Gallery, Contact)
- [ ] Contact form submits successfully
- [ ] Gallery images load
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] Booking links work

### Custom Domain
1. Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., millanluxurycleaning.com)
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

## Database Migration

Your dev database data needs manual copy to production:

1. Export data from development database
2. Import to production database
3. Or use Vercel's database management tools

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite on Vercel**: https://vercel.com/docs/frameworks/vite
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

## Need Help?

Contact GiddyUpp for deployment assistance: https://giddyupp.com

---

**Note**: This deployment requires significant code changes due to Replit-specific features. Consider starting with a static deployment and adding backend features incrementally.
