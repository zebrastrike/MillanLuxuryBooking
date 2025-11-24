# Millan Luxury Cleaning - Project Overview

## Overview

Millan Luxury Cleaning is a high-end residential cleaning service website serving Phoenix, AZ and surrounding areas. The application is a fully functional, production-ready website featuring luxury cleaning services with an emphasis on elegance, visual storytelling, and trust-building. The site includes interactive galleries, admin CMS for content management, client testimonials, and Clerk authentication for secure admin access.

The project follows a luxury hospitality brand aesthetic inspired by Airbnb's trust-building approach combined with high-end spa/hotel design principles, emphasizing tranquility, elegance, and botanical (Feng Shui) visual elements.

## Current Status (as of Nov 21, 2025) - PRODUCTION READY ✅

### Core Features - Complete & Tested
- **Clerk Authentication**: Fully integrated OAuth for production (works on both Replit and Vercel)
- **Admin Dashboard**: Complete with 4 management tabs (Gallery, Testimonials, Services, Contact Messages)
- **Vercel Blob Storage**: All images migrated to cloud (18 gallery images + 4 static assets)
- **PostgreSQL Database**: Neon database connected and populated with content
- **Database Content**: 
  - 18 gallery items with professional cleaning photos
  - 4 services (Deep Cleaning, Move-In/Move-Out, Basic Cleaning, Laundry Services)
  - 3 testimonials from satisfied clients
- **SEO Ready**: robots.txt, sitemap.xml, meta tags, Open Graph, structured data
- **Responsive Design**: Mobile-first with Tailwind CSS and shadcn/ui components

### Architecture
- **Frontend**: React + TypeScript + Vite + Wouter routing
- **Backend**: Express.js with Clerk middleware
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Storage**: Vercel Blob for image uploads
- **Auth**: Clerk OAuth (development + production)
- **Styling**: Tailwind CSS + shadcn/ui (luxury aesthetic)

### Environment Variables Required
- `DATABASE_URL` - Neon PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk backend secret (used by Express middleware)
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key for backend (used by Express middleware)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key for frontend (used by React app)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

**Note**: Both `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` should have the same value. The backend needs `CLERK_PUBLISHABLE_KEY` (without VITE_ prefix), while the frontend uses `VITE_CLERK_PUBLISHABLE_KEY` (with VITE_ prefix for Vite environment variable exposure).

## Deployment Status

### Ready for Vercel Deployment
- All code is production-ready
- All environment variables configured in Neon + Clerk + Vercel Blob
- Database schema created and populated
- Images optimized and stored in cloud (Vercel Blob)
- No local file dependencies (all assets use cloud URLs)

### Deployment Steps (for site owner)
1. Add 4 environment variables to Vercel project settings
2. Redeploy the application
3. Admin dashboard accessible at `/admin` (login with Clerk)
4. Site fully functional with all content pre-populated

See `DEPLOYMENT_CHECKLIST.md` for complete instructions.

## Technical Architecture

### Database Schema
- **users** - Admin user management with Clerk sync
- **galleryItems** - 18 professional cleaning photos with categories
- **services** - 4 service offerings with features
- **testimonials** - Client reviews with 5-star ratings
- **contactMessages** - Form submissions from visitors
- **socialLinks** - (optional) Social media links management
- **googleReviews** - (optional) Google review sync

### API Endpoints
- `GET /api/auth/status` - Check authentication
- `GET /api/auth/user` - Get current user
- `POST /api/upload` - Upload images to Vercel Blob (admin only)
- `GET /api/gallery` - Retrieve gallery items
- `POST/PUT/DELETE /api/gallery/:id` - Manage gallery (admin only)
- `GET /api/services` - Retrieve services
- `POST/PUT/DELETE /api/services/:id` - Manage services (admin only)
- `GET /api/testimonials` - Retrieve testimonials
- `POST/PUT/DELETE /api/testimonials/:id` - Manage testimonials (admin only)
- `POST /api/contact` - Submit contact form (public)
- `GET /api/contact` - View contact messages (admin only)

### Frontend Pages
- **Home** (`/`) - Main landing page with all sections
- **Admin** (`/admin`) - Protected dashboard for managing content
- **404** - Not found fallback

### Key Features
- Fixed navigation that transitions on scroll
- Full-viewport hero section with parallax botanical background
- Interactive before/after gallery
- Service cards with Square booking links
- Contact form with validation
- Business hours display
- FAQ accordion
- Client testimonials carousel
- Footer with social links
- Dark/light mode toggle support

## Data & Images

### Image Storage
- **Host**: Vercel Blob (public URLs)
- **18 Gallery Images**: Professional cleaning before/after shots
- **4 Static Assets**:
  - Dark botanical background (hero section)
  - Light botanical background (services section)
  - Millan logo
  - Owner photo

All images migrated from local storage to Vercel Blob via migration script.

### Sample Content
**Services**:
1. Deep Cleaning - Full coverage of baseboards, ceiling fans, light fixtures, window sills, door frames, deep carpet cleaning
2. Move-In/Move-Out - All surfaces, appliances, carpets, move-in ready
3. Basic Cleaning - Regular maintenance (dusting, vacuuming, mopping, bathrooms, kitchen)
4. Laundry Services - Washing, drying, folding, pressing, stain treatment

**Testimonials**:
- Alexandra Martinez: "Transformed my home. Attention to detail is extraordinary."
- James Chen: "Home has never looked better. Treat your space with respect it deserves."
- Sophia Rodriguez: "Professional, punctual, thorough. Premium products."

## SEO Optimization

### Keywords Targeted
- Luxury cleaning services Phoenix AZ
- Premium house cleaning Arizona
- Deep cleaning Phoenix
- Professional cleaners (7 cities: Phoenix, Surprise, Chandler, Glendale, Mesa, Scottsdale, Tempe)
- Move-in/Move-out cleaning
- Residential cleaning services

### SEO Implementation
- **Title Tag**: Includes all 7 cities and key service descriptions
- **Meta Description**: 160 chars, includes location and services
- **Keywords**: 20+ targeted keywords for luxury cleaning
- **Open Graph**: Social media preview with image
- **Twitter Cards**: Custom Twitter sharing
- **JSON-LD Structured Data**: LocalBusiness schema with 7 service areas
- **Geo-tags**: Phoenix coordinates and Arizona region
- **robots.txt**: Search engine crawl directives
- **sitemap.xml**: Complete URL list with priorities
- **Canonical URL**: Prevents duplicate content issues

### Google Console Integration
See `SEO_GOOGLE_CONSOLE_SETUP.md` for setup instructions.

## User Preferences

**Communication Style**: Simple, everyday language (non-technical)

## Development Setup (Local)

### Install & Run
```bash
npm install
npm run dev
```

### Database Commands
```bash
npm run db:push          # Create/update database schema
npm run db:studio       # Open Drizzle Studio (admin UI for database)
npm run seed           # Populate database with content
```

### Build for Production
```bash
npm run vercel-build    # Build for Vercel
npm run preview         # Preview production build
```

## Files & Structure

```
client/                 # Frontend React app
├── src/
│   ├── pages/         # Home, Admin, 404 pages
│   ├── components/    # UI components (Hero, Gallery, Services, etc.)
│   ├── lib/          # Query client, utilities
│   └── App.tsx       # Main router
└── public/           # Static files (robots.txt, sitemap.xml, favicon)

server/               # Express backend
├── index.ts         # Main server file
├── routes.ts        # API endpoints
├── storage.ts       # Database storage implementation
├── db.ts            # Drizzle ORM setup
├── clerkAuth.ts     # Clerk middleware
└── vite.ts          # Vite dev server setup

shared/              # Shared code
├── schema.ts        # Drizzle schema + Zod validators

scripts/             # Utility scripts
├── migrate-to-blob.ts        # Image migration script
├── seed-database.ts          # Database population script
└── blob-migration-results.json # Migration output

docs/                # Documentation
├── DEPLOYMENT_CHECKLIST.md
├── SEO_GOOGLE_CONSOLE_SETUP.md
└── VERCEL_DEPLOYMENT.md
```

## Next Steps for Site Owner

1. **Add Vercel Environment Variables** - Copy 4 environment variable values into Vercel project
2. **Redeploy** - Trigger deployment to apply variables
3. **Login to Admin** - Access `/admin` with Clerk credentials
4. **Manage Content**:
   - Upload new gallery images
   - Edit service descriptions
   - Add testimonials
   - View contact form submissions
5. **Monitor SEO** - Submit to Google Search Console
6. **Build Backlinks** - Get listed on local Arizona business directories

## Important Links

- **Clerk Dashboard**: https://dashboard.clerk.com
- **Neon Database**: https://console.neon.tech
- **Vercel Project**: https://vercel.com/dashboard
- **Google Search Console**: https://search.google.com/search-console
- **GitHub**: (if code is version controlled)

## Notes for Future Development

### Optional Features (Not Yet Implemented)
1. **Social Links Management** - Database schema exists, needs admin UI + API routes
2. **Google Reviews Sync** - Database schema exists, needs API integration + admin UI
3. **Blog/Insights Section** - For SEO content marketing
4. **Scheduling Integration** - Direct booking instead of Square redirect
5. **Email Notifications** - Auto-reply to contact form submissions

### Performance Optimizations Already Done
- Images optimized and in cloud (no large local files)
- Code splitting via Vite
- Lazy loading for components
- Optimized database queries
- Vercel CDN for fast delivery

### Security Considerations
- Clerk handles authentication (OAuth)
- Admin endpoints protected with middleware
- Database connection via environment variables only
- Blob token never exposed in frontend code
- All form inputs validated with Zod

## Version History

**Nov 21, 2025** - Project Complete
- Fixed Clerk authentication (key format issue resolved)
- Migrated all 18 gallery images to Vercel Blob
- Updated frontend to use Blob URLs instead of local assets
- Created Neon PostgreSQL database
- Seeded database with 18 gallery items, 4 services, 3 testimonials
- Created robots.txt and sitemap.xml for SEO
- Production deployment checklist ready

**Nov 20, 2025** - Feature Completion
- Implemented admin dashboard with full CRUD
- Integrated Vercel Blob storage
- Set up Clerk authentication
- Created database schema
- Added SEO meta tags and structured data

**Nov 14, 2025** - Initial Setup
- Created React + Express + TypeScript stack
- Set up Tailwind CSS + shadcn/ui components
- Implemented luxury design aesthetic
- Created main landing page with all sections
