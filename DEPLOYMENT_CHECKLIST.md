# Millan Luxury Cleaning - Vercel Deployment Checklist

## Pre-Deployment Status ✅

- ✅ Full-stack app (React + Express + TypeScript)
- ✅ Supabase authentication configured
- ✅ Neon PostgreSQL database set up and populated
- ✅ Vercel Blob storage configured with all images
- ✅ Admin dashboard ready (gallery, testimonials, services, contact messages)
- ✅ SEO files created (robots.txt, sitemap.xml)
- ✅ Database seeded with 18 gallery images, 4 services, 3 testimonials

---

## Step 1: Add Environment Variables to Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add:

| Variable Name | Value | Source |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_1uLesPOJM3Am@ep-morning-breeze-aflm4zbe-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=10` | Neon pooled connection string (for Prisma on Vercel) |
| `DIRECT_URL` | `postgresql://neondb_owner:npg_1uLesPOJM3Am@ep-morning-breeze-aflm4zbe.us-west-2.aws.neon.tech/neondb?sslmode=require` | Neon direct (non-pooler) connection for migrations |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings |
| `SUPABASE_ANON_KEY` | Supabase anon public key | Supabase Dashboard → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → API |
| `BLOB_READ_WRITE_TOKEN` | Your Vercel Blob token | Vercel Project → Storage → Blob |

---

## Step 1b: Configure Supabase Auth Redirects (IMPORTANT!)

Before deploying, set redirect URLs in Supabase Dashboard -> **Authentication** -> **URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://your-domain.com` |
| Redirect URLs | `https://your-domain.com/admin` |

---

## Step 2: Redeploy

1. After adding environment variables, Vercel will auto-redeploy
2. Or manually trigger deployment from Vercel dashboard
3. Monitor deployment logs for any errors

---

## Step 3: Verify Deployment

1. **Visit your domain** - Should load the luxury cleaning website
2. **Test auth** - Go to `/admin` and login with Supabase
3. **Check content** - Should see:
   - Gallery with 18 images
   - 4 services with descriptions
   - 3 testimonials
4. **Test functionality**:
   - Upload a new gallery image
   - Add/edit a testimonial
   - Submit contact form

---

## What's Available in Admin Dashboard

Once logged in as admin, you can:

- **Gallery Management**: Upload new images to Vercel Blob, reorder, edit titles/categories
- **Testimonials**: Add, edit, delete customer reviews
- **Services**: Manage service descriptions and features
- **Contact Messages**: View and manage form submissions
- **User Management**: Coming soon (Social Links & Google Reviews optional features)

---

## Important Notes

### Database
- Using Neon PostgreSQL (free tier available)
- All data persists across deployments
- Database connection through environment variables

### Image Storage
- All images stored in Vercel Blob (not local files)
- Admin uploads save directly to Blob
- Supports JPG, PNG, WebP formats

### Authentication
- Using Supabase Auth
- Free tier supports unlimited users
- Admin flag managed in database

### SEO
- robots.txt at `/robots.txt`
- Sitemap at `/sitemap.xml`
- Optimized for 7 Arizona cities
- Open Graph tags for social sharing

---

## Troubleshooting

### Admin login not working?
- Check `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- Verify keys are correctly pasted (no extra spaces)
- Clear browser cache and try again

### Images not loading?
- Check `BLOB_READ_WRITE_TOKEN` is valid
- Verify Blob storage is enabled in Vercel project
- Check image URLs start with `https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com`

### Database errors?
- Check `DATABASE_URL` is correct
- Verify Neon database is accessible
- Database tables were auto-created via `npm run db:push`
- To re-apply the schema and smoke-test connectivity, run `npm run db:verify` with
  `DATABASE_URL` (and `DIRECT_URL` for faster migrations) populated in your environment.

---

## Next Steps After Deployment

1. **Update domain** - Point custom domain to Vercel (if not using `.vercel.app`)
2. **Google Console** - Add domain to Google Search Console
3. **Add Google Business Profile** - Improves local SEO for Phoenix area
4. **Monitor Analytics** - Track visitor behavior and conversions
5. **Add Blog** - Content marketing for SEO (optional future feature)

---

## Support

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify all 4 environment variables are set
3. Clear browser cache
4. Try incognito/private window

For Supabase issues: https://supabase.com/docs
For Vercel issues: https://vercel.com/docs
For Neon issues: https://neon.tech/docs
