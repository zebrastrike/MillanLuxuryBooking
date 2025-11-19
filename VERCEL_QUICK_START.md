# Vercel Deployment - Quick Start

## 🚨 Build Configuration Fixed

**Path normalization issue resolved!**
- Created `build-vercel.sh` wrapper script
- Updated `vercel.json` to use modern configuration format
- This fixes the "cline/index.html" error caused by Vercel's Windows-style path normalization

**Still required:** Set Node.js to 22.x in Vercel Dashboard:
1. Settings → General → Node.js Version → **22.x**

## Files Created for Vercel

✅ **vercel.json** - Vercel configuration for routing and serverless functions
✅ **.vercelignore** - Excludes unnecessary files from deployment  
✅ **.nvmrc** - Tells Vercel to use Node.js 22 (fixes build error)
✅ **api/index.js** - Serverless function entry point (placeholder)
✅ **VERCEL_DEPLOYMENT.md** - Complete deployment guide

## Quick Deploy Steps

### 1. Add Build Script (Required)

Since package.json can't be edited automatically, manually add this script:

Open `package.json` and add to the "scripts" section:

```json
"vercel-build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 3. Deploy on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist/public`
4. Add Environment Variables:
   - `DATABASE_URL` = your Neon PostgreSQL connection string
   - `SESSION_SECRET` = any random secret key
   - `BLOB_READ_WRITE_TOKEN` = get from Vercel Storage → Blob (see below)
   - `NODE_ENV` = production
5. Click **Deploy**

### Getting Blob Storage Token:

After deploying:
1. Go to your Vercel project → **Storage** tab
2. Create a Blob store (if not exists)
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add it to Environment Variables
5. Redeploy to apply the token

## ⚠️ CRITICAL: Authentication & Security Warning

**DO NOT DEPLOY TO PRODUCTION WITHOUT FIXING AUTHENTICATION!**

Your app currently uses **Replit Auth** which will NOT work on Vercel.

### Security Issues:

1. **Upload endpoint has NO authentication** - Anyone can upload files to your Blob storage
2. **Admin endpoints are unprotected** on Vercel
3. This creates severe security vulnerabilities

### Before Production Deployment:

**You MUST implement Vercel-compatible authentication:**
- Recommended: **Clerk** (easiest setup with Vercel)
- Alternatives: Auth0, NextAuth.js

**Protect these endpoints:**
- `/api/upload` - File uploads (CRITICAL!)
- `/api/gallery/*` - Gallery management
- `/api/testimonials/*`, `/api/services/*` - Content management
- All admin panel features

See VERCEL_DEPLOYMENT.md for detailed instructions.

**Before deploying, you must:**
- Remove authentication/admin features, OR
- Replace with Vercel-compatible auth (Clerk, Auth0, NextAuth)

See **VERCEL_DEPLOYMENT.md** for complete details.

## Need Full Instructions?

Read **VERCEL_DEPLOYMENT.md** for:
- Detailed authentication replacement guide
- Database migration steps
- Troubleshooting tips
- Architecture recommendations

---

Built by [GiddyUpp](https://giddyupp.com)
