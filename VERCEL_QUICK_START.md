# Vercel Deployment - Quick Start

## Files Created for Vercel

✅ **vercel.json** - Vercel configuration for routing and serverless functions
✅ **.vercelignore** - Excludes unnecessary files from deployment  
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
   - `NODE_ENV` = production
5. Click **Deploy**

## ⚠️ Important Authentication Warning

Your app currently uses **Replit Auth** which will NOT work on Vercel.

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
