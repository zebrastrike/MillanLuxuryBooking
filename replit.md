# Millan Luxury Cleaning - Project Overview

## Overview

Millan Luxury Cleaning is a high-end residential cleaning service website serving Phoenix, AZ. The application is a single-page marketing website designed to showcase luxury cleaning services with an emphasis on elegance, visual storytelling, and trust-building. The site features service listings, an interactive before/after gallery, client testimonials, and a contact form for booking inquiries.

The project follows a luxury hospitality brand aesthetic inspired by Airbnb's trust-building approach combined with high-end spa/hotel design principles, emphasizing tranquility, elegance, and botanical (Feng Shui) visual elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**Routing**: Wouter for lightweight client-side routing (single-page application with home page and 404 fallback).

**UI Component Library**: Shadcn/ui (Radix UI primitives) with the "new-york" style variant, providing accessible, customizable components with Tailwind CSS styling.

**Design System**:
- Typography: Playfair Display (serif) for headings, Inter (sans-serif) for body text
- Color scheme: Neutral base with gold/luxury accents (primary color: `hsl(42 95% 42%)`)
- Spacing: Tailwind utility classes with consistent rhythm (4, 6, 8, 12, 16, 20, 24)
- Components follow luxury aesthetic with botanical backgrounds, gold crown branding, and elegant card-based layouts

**State Management**: 
- TanStack Query (React Query) for server state management and data fetching
- React Hook Form with Zod validation for form handling

**Key Features**:
- Responsive design with mobile-first approach
- Fixed navigation that transitions on scroll
- Full-viewport hero section with parallax botanical background
- Interactive before/after gallery with lightbox modal and filtering
- Service cards with direct Square booking links
- Contact form with validation
- Business hours display
- FAQ accordion
- Client testimonials section
- Footer with social links

### Backend Architecture

**Server Framework**: Express.js with TypeScript running in ESM mode.

**API Design**: RESTful endpoints with JSON responses following a consistent pattern:
```typescript
{ success: boolean, data?: any, message?: string, errors?: any }
```

**Key Endpoints**:
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Retrieve all contact messages
- `GET /api/contact/:id` - Retrieve specific contact message
- `POST /api/upload` - Upload file to Vercel Blob (⚠️ no auth on Vercel)
- `GET /api/gallery` - Retrieve gallery items
- `POST /api/gallery` - Create gallery item
- `GET /api/gallery/:id` - Retrieve specific gallery item
- `PUT /api/gallery/:id` - Update gallery item
- `DELETE /api/gallery/:id` - Delete gallery item

**Data Validation**: Zod schemas shared between client and server for type safety and runtime validation.

**Development Setup**: Vite middleware integration for HMR (Hot Module Replacement) during development, with custom error overlay and logging.

### Data Storage

**Current Implementation**: In-memory storage using JavaScript Maps for development/demonstration purposes.

**Storage Interface**: Abstract `IStorage` interface allows for easy swapping to database implementations without changing business logic.

**Data Models**:
- `ContactMessage`: Contact form submissions with name, email, service, message, timestamp
- `GalleryItem`: Gallery images with title, category (deep-cleaning, move-in-out, all), image URLs (supports both single collage images or separate before/after images), order, and timestamps

**Database Preparation**: Drizzle ORM configured with PostgreSQL dialect, ready for database integration. Configuration includes schema path (`./shared/schema.ts`) and migration output directory (`./migrations`).

### External Dependencies

**Third-Party Services**:
- **Square Booking**: External booking system for appointment scheduling (links embedded in service cards)
  - URLs: `book.squareup.com/appointments/[location_id]/services/[service_id]`
- **Vercel Blob**: Cloud file storage for gallery images (production only)
  - Requires `BLOB_READ_WRITE_TOKEN` environment variable
  - Images uploaded via `/api/upload` endpoint to blob storage
  - ⚠️ Upload endpoint currently lacks authentication for Vercel deployment
  
**CDN/External Assets**:
- Google Fonts: Playfair Display and Inter fonts loaded via CDN
- Generated botanical background images stored in `attached_assets/generated_images/`

**UI Libraries**:
- Radix UI: Comprehensive set of accessible component primitives (@radix-ui/react-*)
- Embla Carousel: For potential carousel implementations
- React Compare Image: For before/after image comparison in gallery
- Lucide React: Icon library
- React Icons: Additional icons (Instagram, Yelp social icons)

**Development Tools**:
- Replit-specific plugins: Runtime error modal, cartographer, dev banner (development only)
- PostCSS with Tailwind CSS and Autoprefixer for styling
- ESBuild for production server bundling

**Validation & Forms**:
- Zod: Schema validation shared across client and server
- React Hook Form: Form state management with Zod resolver integration

**Utilities**:
- date-fns: Date manipulation and formatting
- clsx + tailwind-merge: Utility class name management
- class-variance-authority: Component variant styling
- nanoid: Unique ID generation

**File Storage & Upload**:
- **@vercel/blob**: Vercel Blob storage SDK for cloud file uploads
- **multer**: Middleware for handling multipart/form-data file uploads
- File upload workflow: Frontend uploads file → `/api/upload` → Vercel Blob → URL returned

**Database (Configured but not actively used)**:
- Drizzle ORM: Type-safe ORM for PostgreSQL
- @neondatabase/serverless: Neon PostgreSQL serverless driver
- drizzle-zod: Zod schema integration for Drizzle

## Deployment

### Vercel Deployment Status

**Current Status**: Successfully building and deploying to Vercel

**Key Configuration**:
- Build command: `npm run vercel-build`
- Output directory: `dist/public`
- Node.js version: 22.x (required)
- Framework preset: Vite

**Required Environment Variables for Vercel**:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SESSION_SECRET` - Random secret for session encryption
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage access token
- `NODE_ENV=production`

**Critical Known Issues**:
1. ⚠️ **Authentication does not work on Vercel** - Replit Auth is platform-specific
   - Admin panel and protected routes will be inaccessible on Vercel
   - Upload endpoint (`/api/upload`) has **NO AUTHENTICATION** on Vercel
   - **SECURITY RISK**: Anyone can upload files to Blob storage if deployed without fixing auth
   
2. **Required before production**:
   - Implement Vercel-compatible authentication (Clerk, Auth0, or NextAuth.js)
   - Protect all admin endpoints with new auth middleware
   - Test authentication flow on Vercel preview deployments

**Documentation**:
- `VERCEL_DEPLOYMENT.md` - Comprehensive deployment guide
- `VERCEL_QUICK_START.md` - Quick reference for deployment steps
- `build-vercel.sh` - Build script for Vercel deployments
- `.vercelignore` - Files excluded from deployment