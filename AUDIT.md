# MILLAN LUXURY BOOKING - COMPREHENSIVE SYSTEM AUDIT

**Audit Date:** January 18, 2026
**Project:** Millan Luxury Cleaning Website
**Purpose:** Full Square Store Integration for Products & Services
**Auditor:** Senior Engineer (Tessl-assisted)
**Executor:** Codex

---

# EXECUTIVE SUMMARY

## Production Readiness: 40% - NEEDS WORK

| Category | Status | Readiness |
|----------|--------|-----------|
| React Frontend | Ready | 90% |
| Express Backend | Partial | 70% |
| Supabase Auth | Ready | 85% |
| Admin Dashboard | Ready | 80% |
| Square OAuth | Implemented | 100% |
| Database Schema | Incomplete | 40% |
| Shopping Cart | Missing | 0% |
| Checkout/Payments | Missing | 0% |
| Order Tracking | Missing | 0% |
| Booking System | Missing | 5% |
| Inventory Sync | Missing | 0% |

---

# CRITICAL BLOCKERS (7 Total)

## BLOCKER 1: Missing Database Columns
**Severity:** CRITICAL
**Impact:** Catalog sync loses Square IDs
**Status:** PARTIAL - Prisma schema updated; DB migration not applied.

FragranceProduct model is missing:
- `squareCatalogId` (String)
- `squareItemId` (String)
- `squareVariationId` (String)
- `inventoryCount` (Int)
- `lowStockThreshold` (Int)
- `trackInventory` (Boolean)

ServiceItem model is missing:
- `squareServiceId` (String)
- `squareTeamMemberIds` (String[])
- `duration` (Int)

## BLOCKER 2: No Cart/Order/Booking Models
**Severity:** CRITICAL
**Impact:** Cannot build e-commerce flow
**Status:** PARTIAL - Prisma models defined; DB migration not applied.

Missing Prisma models:
- `Cart` + `CartItem`
- `Order` + `OrderItem`
- `Booking`
- `InventorySync`

## BLOCKER 3: Authentication Bypass Vulnerability
**Severity:** HIGH (Security)
**Impact:** Admin routes accessible if Supabase misconfigured
**Status:** DONE - admin auth fails closed; dev admin auto-provision removed.

When `SUPABASE_URL` is missing, auth fails open in some scenarios.
Auto-provisioning creates users without proper validation.

## BLOCKER 4: Square Feature Flags OFF
**Severity:** MEDIUM
**Impact:** All Square endpoints return 403
**Status:** PENDING - runtime env flags must be enabled.

```env
SQUARE_ENABLED=false        # Must be true
SQUARE_SYNC_ENABLED=false   # Must be true
```

## BLOCKER 5: No Webhook Handlers
**Severity:** HIGH
**Impact:** No real-time updates from Square
**Status:** DONE - webhook endpoint with signature validation added.

Missing endpoint: `POST /api/webhooks/square`
Cannot receive: order.completed, payment.created, inventory.count.updated

## BLOCKER 6: Token Encryption Inconsistency
**Severity:** MEDIUM
**Impact:** Potential token corruption
**Status:** DONE - unified encryption via ENCRYPTION_KEY.

Two services encrypt differently:
- `squareAuth.ts` uses `getEncryptionKey()`
- `tokenService.ts` uses `env.oauthEncryptionKey`

## BLOCKER 7: Contact Form Rate Limiting Weak
**Severity:** MEDIUM
**Impact:** Spam vulnerability
**Status:** PARTIAL - in-memory rate limit added; no Redis persistence.

In-memory Map resets on restart. No CAPTCHA. No Redis persistence.

---

# DEPRECATED CODE (Remove)

| Item | Location | Reason | Status |
|------|----------|--------|--------|
| BrandingAsset model | `prisma/schema.prisma` | Replaced by SiteAsset | DONE (migration pending) |
| Clerk references | Comments in `server/routes.ts` | Using Supabase now | DONE |
| `useSiteAssets.ts` hook | `client/src/hooks/` | Not used anywhere | DONE |
| Metadata fields in BrandingAsset | `prisma/schema.prisma` | Never populated | DONE (migration pending) |

---

# CUSTOMER DATA ARCHITECTURE

## Current State: ADMIN-ONLY SYSTEM

| Data Type | Stored | Location |
|-----------|--------|----------|
| User Profile | Yes | User model (id, email, name, isAdmin) |
| Contact Messages | Yes | ContactMessage model |
| Testimonials | Yes | Testimonial model |
| Order History | NO | Missing Order model |
| Payment Info | NO | Handled by Square (PCI) |
| Addresses | NO | Missing Address model |
| Preferences | NO | Not implemented |

## Can Customers Create Accounts?
**NO** - Currently admin-only. Users auto-provisioned on first login.

## GDPR Gaps
- No data export endpoint
- No right-to-be-forgotten endpoint
- No data retention policy
- No consent management
- Contact messages stored indefinitely

---

## TABLE OF CONTENTS

1. [Security Audit (Existing)](#security-and-reliability-audit)
2. [Current System Architecture](#current-system-architecture)
3. [API Endpoints Audit](#api-endpoints-audit)
4. [Database Schema Audit](#database-schema-audit)
5. [Frontend Pages Audit](#frontend-pages-audit)
6. [Square API Capabilities](#square-api-capabilities)
7. [Integration Gap Analysis](#integration-gap-analysis)
8. [Implementation Plan](#implementation-plan)
9. [Database Migrations](#database-migrations)
10. [New API Endpoints](#new-api-endpoints)
11. [Frontend Changes](#frontend-changes)
12. [Security Considerations](#security-considerations)
13. [Testing Strategy](#testing-strategy)
14. [Rollout Plan](#rollout-plan)
15. [Execution Checklist](#execution-checklist-for-codex)

---

# Security and Reliability Audit

## High-Risk Issues

### Unauthenticated admin surfaces when Clerk is misconfigured
Admin protection short-circuits whenever Clerk keys are absent, meaning every admin-only route (uploads, content management, contact message retrieval) becomes publicly accessible if environment variables are missing or mistyped. The `/api/auth/user` endpoint also auto-creates a privileged "dev-admin" user with no authentication in this mode, so a configuration slip in production would expose full administrative control.
- Location: `server/routes.ts` (`createIsAdminMiddleware` bypass and dev admin fallback).

### Unbounded in-memory file uploads with unsafe filenames
Uploads use `multer.memoryStorage()` with no size limits or MIME validation. Attackers can exhaust memory or upload unexpected content. Filenames are constructed with the raw `originalname`, allowing path-like values (e.g., containing slashes or Unicode control characters) to propagate to Vercel Blob keys.
- Location: `server/routes.ts` (upload handler and memory storage setup).

### PII leakage through response-body logging
A global middleware logs full JSON responses for every `/api` request. This captures sensitive fields (contact form messages, user profiles) and writes them to application logs, increasing risk of inadvertent disclosure and complicating compliance.
- Location: `server/index.ts` (response logging middleware).

### Error handler rethrows after responding
The Express error handler returns an HTTP response and then rethrows the error, which can crash the process and lead to downtime instead of isolating the failure to the request scope.
- Location: `server/index.ts` (global error handler).

## Medium/Operational Risk

### No abuse protection on public contact form
The contact submission endpoint is fully unauthenticated and lacks throttling or bot protection. This leaves the application open to spam, storage abuse, or email flooding without any rate limiter or CAPTCHA guardrail.
- Location: `server/routes.ts` (contact form handler).

## Recommendations
- Enforce admin authentication regardless of Clerk availability; fail closed when credentials are missing and avoid auto-provisioning privileged accounts in production configurations.
- Add upload constraints: size limits, MIME/type checks, safe filename normalization, and preferably streaming to avoid memory pressure.
- Remove or redact response-body logging for endpoints that handle user data; log request IDs and status codes instead.
- Adjust error handling to log and continue without rethrowing after a response has been sent.
- Introduce rate limiting and bot-detection (e.g., CAPTCHA) on public forms to limit abuse.

---

# SQUARE INTEGRATION PLAN

## Canonical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW (Production)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SQUARE (Source of Truth)                                      │
│   ├── Catalog API (prices, items, variations)                   │
│   ├── Inventory API (stock levels)                              │
│   ├── Payments API (PCI-compliant transactions)                 │
│   └── Bookings API (appointments)                               │
│            │                                                    │
│            ▼ (sync + webhooks)                                  │
│                                                                 │
│   SUPABASE POSTGRES (Operational Database)                      │
│   ├── FragranceProduct (catalog mirror)                         │
│   ├── Cart / CartItem (shopping sessions)                       │
│   ├── Order / OrderItem (purchase history)                      │
│   ├── Booking (appointment records)                             │
│   └── User (authentication)                                     │
│            │                                                    │
│            ▼ (Prisma queries)                                   │
│                                                                 │
│   VERCEL API ROUTES (/api/*)                                    │
│   ├── Stateless execution                                       │
│   ├── Secure env vars (tokens never in client)                  │
│   └── Auto-scaling                                              │
│            │                                                    │
│            ▼ (JSON responses)                                   │
│                                                                 │
│   REACT FRONTEND                                                │
│   ├── Product Cards (NO REBUILD NEEDED)                         │
│   ├── Cart UI                                                   │
│   ├── Checkout (Web Payments SDK)                               │
│   └── Booking UI                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Role Separation (DO NOT BLUR)

| Component | Responsibility | What It Does NOT Do |
|-----------|---------------|---------------------|
| **Square** | Prices, inventory truth, payments, bookings, PCI compliance | Store user sessions, cache data |
| **Supabase** | Normalized catalog mirror, carts, orders, users, operational queries | Handle payments, be the price source |
| **Vercel** | Frontend serving, API execution, env var security | Store secrets in client, call Square directly from browser |
| **React** | UI rendering, user interaction | Fetch Square data directly, store tokens |

## Current System Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Express.js + TypeScript (Vercel Serverless)
- **Database:** PostgreSQL (Supabase) - **Operational DB, not cache**
- **ORM:** Prisma
- **Auth:** Supabase Auth
- **Storage:** Vercel Blob
- **Routing:** Wouter
- **Data Fetching:** TanStack React Query

### Current Square Integration (Partial)
| Feature | Status | Implementation |
|---------|--------|----------------|
| Products | Redirect Only | `squareUrl` field links to Square site |
| Services | Redirect Only | Hardcoded Square Appointments booking URLs |
| Checkout | None | All purchases redirect to external Square site |
| Inventory | None | Manual product management only |
| Orders | None | No visibility into purchases |
| Bookings | None | External Square Appointments only |

---

## Live States (When Can This Ship?)

### State 1: Browse-Only (CAN SHIP IMMEDIATELY)
- Square catalog synced to Supabase
- Prices + images live on product cards
- Inventory status visible
- "Add to cart" hidden or disabled
- **Result:** SEO live, marketing live, no payments

### State 2: Commerce Live (STANDARD E-COMMERCE)
- Cart fully enabled
- Square Web Payments SDK integrated
- Orders written to Supabase
- Payments processed by Square
- **Result:** Full e-commerce, PCI compliant, no redirects

### State 3: Full Platform (COMMERCE + BOOKINGS)
- Embedded service booking
- Real-time availability calendar
- Admin booking management
- **Result:** Complete platform

---

## API Endpoints Audit

### Summary: 46 Total Endpoints

| Category | Count | Public | Auth | Admin |
|----------|-------|--------|------|-------|
| Authentication | 4 | 1 | 1 | 2 |
| File Storage | 5 | 0 | 0 | 5 |
| Site Assets | 3 | 1 | 0 | 2 |
| Contact | 3 | 1 | 0 | 2 |
| Gallery | 5 | 2 | 0 | 3 |
| Testimonials | 7 | 1 | 0 | 6 |
| Google Reviews | 1 | 0 | 0 | 1 |
| FAQs | 4 | 1 | 0 | 3 |
| Services | 4 | 1 | 0 | 3 |
| Blog Posts | 6 | 2 | 0 | 4 |
| Products | 4 | 1 | 0 | 3 |
| **TOTAL** | **46** | **12** | **1** | **33** |

### Products Endpoints (Current)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/products` | Public | Get visible products |
| POST | `/api/products` | Admin | Create product |
| PATCH | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |

### Services Endpoints (Current)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/services` | Public | Get visible services |
| POST | `/api/services` | Admin | Create service |
| PATCH | `/api/services/:id` | Admin | Update service |
| DELETE | `/api/services/:id` | Admin | Delete service |

---

## Database Schema Audit

### FragranceProduct Model (Primary for Square)
```prisma
model FragranceProduct {
  id           Int      @id @default(autoincrement())
  name         String
  description  String
  category     String   // "candle-3wick", "car-diffuser", etc.
  fragrance    String   // "Bell", "Golden Hour", etc.
  price        Decimal  @db.Decimal(10, 2)     // SQUARE RELEVANT
  salePrice    Decimal? @db.Decimal(10, 2)     // SQUARE RELEVANT
  displayPrice Boolean  @default(true)          // SQUARE RELEVANT
  isVisible    Boolean  @default(true)
  imageUrl     String?
  squareUrl    String                           // SQUARE RELEVANT (redirect only)
  sku          String?  @unique                 // SQUARE RELEVANT
  featured     Boolean  @default(false)
  order        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### ServiceItem Model
```prisma
model ServiceItem {
  id           Int      @id @default(autoincrement())
  title        String
  description  String
  price        Decimal? @db.Decimal(10, 2)     // SQUARE RELEVANT
  displayPrice Boolean  @default(false)         // SQUARE RELEVANT
  isVisible    Boolean  @default(true)
  features     String[] @default([])
  order        Int      @default(0)
}
```

### Missing Fields for Full Integration
**FragranceProduct needs:**
- `squareCatalogId` - Square's catalog object ID
- `squareItemId` - Square's item ID
- `squareVariationId` - Square's variation ID
- `inventoryCount` - Current stock level
- `lowStockThreshold` - Alert threshold
- `trackInventory` - Enable/disable tracking

**ServiceItem needs:**
- `squareServiceId` - Square's service ID
- `squareTeamMemberIds` - Assigned team members
- `duration` - Service duration in minutes

---

## Frontend Pages Audit

### Current Routes
```
/ → Home (Services, Gallery, Testimonials, FAQ, Contact)
/fragrances → Product catalog (72 products, 6 categories)
/blog → Blog listing
/blog/:slug → Blog post detail
/admin → Admin dashboard (9 tabs)
```

### Fragrances Page Current State
- **Data Source:** `/api/products` (local database)
- **Categories:** 3-Wick Candles, Single Candles, Mini Candles, Car Diffusers, Room Sprays, Cleaners
- **Current Behavior:** "Shop Now" redirects to `squareUrl` (external Square site)
- **Missing:** Cart, checkout, inventory display

### Services Component Current State
- **Location:** Home page
- **Hardcoded Square URLs:**
  - Deep Cleaning: `https://book.squareup.com/.../FFGMODYFN5GMOMSM6XGSCGOL`
  - Move-In/Move-Out: `https://book.squareup.com/.../QQ6C57O7KL2CKRAMUSEPFPFQ`
  - Basic Cleaning: `https://book.squareup.com/.../SYVYEI7QQUJX5UD3DGCOCI3O`
  - Laundry Services: `https://book.squareup.com/.../Y3TRG3L3NFEQZ7ZW53D3OD23`

---

## Square API Capabilities

### APIs to Integrate

| API | Purpose | Documentation |
|-----|---------|---------------|
| **Catalog API** | Manage products, sync inventory | [Docs](https://developer.squareup.com/docs/catalog-api/what-it-does) |
| **Inventory API** | Track stock levels | [Docs](https://developer.squareup.com/docs/inventory-api/what-it-does) |
| **Checkout API** | Hosted checkout pages | [Docs](https://developer.squareup.com/docs/checkout-api) |
| **Web Payments SDK** | Embedded payment forms | [Docs](https://developer.squareup.com/docs/web-payments/overview) |
| **Payments API** | Process payments | [Docs](https://developer.squareup.com/reference/square/payments-api) |
| **Orders API** | Create/track orders | [Docs](https://developer.squareup.com/docs/orders-api/what-it-does) |
| **Bookings API** | Appointment scheduling | [Docs](https://developer.squareup.com/docs/bookings-api/what-it-is) |
| **Customers API** | Customer profiles | [Docs](https://developer.squareup.com/docs/customers-api/what-it-does) |

### NPM Packages Required
```json
{
  "square": "^35.0.0",
  "react-square-web-payments-sdk": "^3.0.0"
}
```

---

## Integration Gap Analysis

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Product Display | Local DB | Local + Square sync | Add sync mechanism |
| Product Purchase | Redirect | Embedded checkout | Add Web Payments SDK |
| Shopping Cart | None | Full cart system | Build cart |
| Inventory | None | Real-time sync | Add Inventory API |
| Order Tracking | None | Order history | Add Orders API |
| Service Booking | Redirect | Embedded booking | Add Bookings API |
| Availability | None | Real-time slots | Add Bookings API |
| Payments | None | Native payments | Add Payments API |
| Webhooks | None | Real-time updates | Add webhook handlers |

---

## Implementation Plan

### Phase 1: Foundation (Week 1) - CRITICAL
1. Install Square SDK packages
2. Create Square service module (`/server/services/square.ts`)
3. Database migrations for new fields/models
4. Square OAuth flow for merchant authorization
5. Environment configuration

### Phase 2: Catalog Sync (Week 2) - HIGH
1. Import products from Square catalog
2. Export products to Square catalog
3. Bidirectional sync mechanism
4. Webhook handlers for catalog updates

### Phase 3: Shopping Cart (Week 3) - HIGH
1. Cart context/provider
2. Cart API endpoints
3. Cart UI components (drawer, items, summary)
4. Cart persistence (localStorage + DB)

### Phase 4: Checkout & Payments (Week 4) - CRITICAL
1. Checkout page with order summary
2. Web Payments SDK integration (Card, Apple Pay, Google Pay)
3. Payment processing endpoint
4. Order creation and tracking
5. Payment webhooks

### Phase 5: Bookings Integration (Week 5) - HIGH
1. Availability calendar component
2. Booking flow (service → time → confirm)
3. Booking API endpoints
4. Admin booking management
5. Booking webhooks

### Phase 6: Customer Portal (Week 6) - MEDIUM
1. Order history page
2. Booking history
3. Reorder functionality
4. Admin enhancements

---

## Database Migrations

### New Models to Create

#### SquareConfig
```prisma
model SquareConfig {
  id              Int      @id @default(autoincrement())
  accessToken     String   // Encrypted
  refreshToken    String?  // Encrypted
  merchantId      String
  locationId      String
  applicationId   String
  environment     String   // "sandbox" | "production"
  webhookSignature String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("square_config")
}
```

#### Cart & CartItem
```prisma
model Cart {
  id        String     @id @default(cuid())
  sessionId String?
  userId    String?
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  expiresAt DateTime

  @@map("carts")
}

model CartItem {
  id        Int      @id @default(autoincrement())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId Int
  quantity  Int      @default(1)
  price     Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())

  @@map("cart_items")
}
```

#### Order & OrderItem
```prisma
model Order {
  id              Int         @id @default(autoincrement())
  squareOrderId   String      @unique
  userId          String?
  email           String
  status          String      @default("pending") // pending|paid|fulfilled|cancelled
  total           Decimal     @db.Decimal(10, 2)
  subtotal        Decimal     @db.Decimal(10, 2)
  tax             Decimal?    @db.Decimal(10, 2)
  items           OrderItem[]
  shippingAddress Json?
  billingAddress  Json?
  paymentId       String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@map("orders")
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId Int
  name      String
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  sku       String?

  @@map("order_items")
}
```

#### Booking
```prisma
model Booking {
  id              Int      @id @default(autoincrement())
  squareBookingId String   @unique
  customerId      String?
  customerEmail   String
  customerName    String
  customerPhone   String?
  serviceId       Int
  teamMemberId    String?
  startAt         DateTime
  endAt           DateTime
  status          String   @default("pending") // pending|confirmed|cancelled|completed
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("bookings")
}
```

### Field Additions

#### FragranceProduct additions:
```prisma
squareCatalogId    String?
squareItemId       String?
squareVariationId  String?
inventoryCount     Int      @default(0)
lowStockThreshold  Int      @default(5)
trackInventory     Boolean  @default(false)
```

#### ServiceItem additions:
```prisma
squareServiceId      String?
squareTeamMemberIds  String[]
duration             Int      @default(60)
```

---

## New API Endpoints

### Square Configuration (4 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/square/config` | Admin | Get config status |
| POST | `/api/square/connect` | Admin | Initiate OAuth |
| GET | `/api/square/callback` | Public | OAuth callback |
| POST | `/api/square/disconnect` | Admin | Disconnect Square |

### Catalog Sync (3 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/square/catalog/sync` | Admin | Full sync |
| POST | `/api/square/catalog/import` | Admin | Import from Square |
| POST | `/api/square/catalog/export` | Admin | Export to Square |

### Inventory (3 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/inventory` | Admin | Get all levels |
| GET | `/api/inventory/:productId` | Public | Get product stock |
| POST | `/api/inventory/sync` | Admin | Sync from Square |

### Cart (5 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/cart` | Public | Get current cart |
| POST | `/api/cart/items` | Public | Add item |
| PATCH | `/api/cart/items/:id` | Public | Update quantity |
| DELETE | `/api/cart/items/:id` | Public | Remove item |
| DELETE | `/api/cart` | Public | Clear cart |

### Checkout & Orders (6 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/checkout/create` | Public | Create checkout |
| POST | `/api/checkout/payment` | Public | Process payment |
| GET | `/api/orders` | Auth | User's orders |
| GET | `/api/orders/:id` | Auth | Order details |
| GET | `/api/orders/admin` | Admin | All orders |
| PATCH | `/api/orders/:id/status` | Admin | Update status |

### Bookings (7 endpoints)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/bookings/availability` | Public | Get slots |
| POST | `/api/bookings` | Public | Create booking |
| GET | `/api/bookings` | Auth | User's bookings |
| GET | `/api/bookings/:id` | Auth | Booking details |
| PATCH | `/api/bookings/:id` | Auth | Update booking |
| DELETE | `/api/bookings/:id` | Auth | Cancel booking |
| GET | `/api/bookings/admin` | Admin | All bookings |

### Webhooks (1 endpoint)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/webhooks/square` | Signature | Square webhook handler |

---

## Frontend Changes

### New Components Structure
```
client/src/components/
├── cart/
│   ├── CartProvider.tsx       # Context provider
│   ├── CartDrawer.tsx         # Slide-out cart
│   ├── CartItem.tsx           # Cart item row
│   ├── CartSummary.tsx        # Totals display
│   └── AddToCartButton.tsx    # Add button
├── checkout/
│   ├── CheckoutPage.tsx       # Main checkout
│   ├── OrderSummary.tsx       # Order review
│   ├── ShippingForm.tsx       # Address form
│   ├── PaymentForm.tsx        # Square SDK
│   └── OrderConfirmation.tsx  # Success page
├── booking/
│   ├── BookingWidget.tsx      # Booking modal
│   ├── AvailabilityCalendar.tsx
│   ├── ServiceSelector.tsx
│   └── BookingConfirmation.tsx
└── orders/
    ├── OrderHistory.tsx       # Order list
    ├── OrderDetail.tsx        # Single order
    └── OrderStatusBadge.tsx   # Status display
```

### New Pages
```
client/src/pages/
├── cart.tsx              # Full cart page
├── checkout.tsx          # Checkout flow
├── checkout/success.tsx  # Confirmation
├── orders/index.tsx      # Order history
├── orders/[id].tsx       # Order detail
├── book.tsx              # Booking page
└── book/confirm.tsx      # Booking confirmation
```

### New Routes
```
/cart → Cart page
/checkout → Checkout flow
/checkout/success → Order confirmation
/orders → Order history
/orders/:id → Order detail
/book → Booking selection
/book/confirm → Booking confirmation
```

### Component Updates Required

#### FragranceCard.tsx - NO REBUILD NEEDED
**What changes:**
- Data source becomes Square-backed (via `/api/products`)
- Add inventory status indicator (In Stock / Low Stock / Out of Stock)
- Add "Add to Cart" button (Phase 3)

**What does NOT change:**
- Card layout
- React component structure
- Routing

**Why:** The existing cards already consume `/api/products`. That endpoint becomes Square-backed. Data shape stays compatible. Cards re-render automatically with Square data.

---

### UI Enhancement: Floral Neon Glow Effect

**Target:** All FragranceCard components on `/fragrances` page

**Effect:** Each card glows with a unique floral neon color on interaction

#### Color Palette (12 fragrances = 12 unique glows)
```css
/* Floral Neon Glow Colors */
--glow-bell: #FF69B4;              /* Hot Pink - Bell */
--glow-brazilian: #00FF7F;          /* Spring Green - Brazilian Paradise */
--glow-gabrielle: #FFD700;          /* Gold - Gabrielle by Chanel */
--glow-golden-hour: #FFA500;        /* Orange - Golden Hour */
--glow-guilty: #9400D3;             /* Dark Violet - Guilty by Gucci */
--glow-mahogany: #8B4513;           /* Saddle Brown with glow - Mahogany Royal */
--glow-my-way: #FF1493;             /* Deep Pink - My Way */
--glow-ocean-rain: #00CED1;         /* Dark Turquoise - Ocean Rain */
--glow-piney-queen: #228B22;        /* Forest Green - Piney Queen */
--glow-sauvage: #4169E1;            /* Royal Blue - Sauvage by Dior */
--glow-sweater-weather: #DDA0DD;    /* Plum - Sweater Weather */
--glow-christmas: #DC143C;          /* Crimson - Under The Christmas Tree */
```

#### Desktop Implementation (hover)
```tsx
// FragranceCard.tsx - Add to card wrapper
<div
  className={cn(
    "group relative rounded-2xl overflow-hidden transition-all duration-300",
    "hover:shadow-[0_0_30px_rgba(var(--glow-color),0.6)]",
    "hover:scale-[1.02]"
  )}
  style={{ '--glow-color': getGlowColor(product.fragrance) }}
>
```

#### Mobile Implementation (scroll into view)
```tsx
// Use Intersection Observer for scroll-triggered glow
const [isInView, setIsInView] = useState(false);
const cardRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setIsInView(entry.isIntersecting),
    { threshold: 0.5 }
  );
  if (cardRef.current) observer.observe(cardRef.current);
  return () => observer.disconnect();
}, []);

// Apply glow class when in view on mobile
<div
  ref={cardRef}
  className={cn(
    "transition-all duration-500",
    isInView && "md:shadow-none shadow-[0_0_25px_rgba(var(--glow-color),0.5)]"
  )}
>
```

#### CSS Animation (optional pulse)
```css
@keyframes floral-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--glow-color), 0.4); }
  50% { box-shadow: 0 0 35px rgba(var(--glow-color), 0.7); }
}

.card-glow-active {
  animation: floral-pulse 2s ease-in-out infinite;
}
```

#### Helper Function
```typescript
// lib/glowColors.ts
export const fragranceGlowColors: Record<string, string> = {
  "Bell": "255, 105, 180",
  "Brazilian Paradise": "0, 255, 127",
  "Gabrielle (Women) by Chanel": "255, 215, 0",
  "Golden Hour": "255, 165, 0",
  "Guilty (Men) by Gucci": "148, 0, 211",
  "Mahogany Royal": "139, 69, 19",
  "My Way": "255, 20, 147",
  "Ocean Rain": "0, 206, 209",
  "Piney Queen": "34, 139, 34",
  "Sauvage (Men) by Dior": "65, 105, 225",
  "Sweater Weather": "221, 160, 221",
  "Under The Christmas Tree": "220, 20, 60",
};

export function getGlowColor(fragrance: string): string {
  return fragranceGlowColors[fragrance] || "255, 255, 255";
}
```

#### Execution Checklist
- [ ] Create `lib/glowColors.ts` with fragrance-to-color mapping
- [ ] Add CSS custom properties for glow colors
- [ ] Update FragranceCard with hover glow effect
- [ ] Add Intersection Observer for mobile scroll glow
- [ ] Add optional pulse animation
- [ ] Test on desktop (hover) and mobile (scroll)
- [ ] Ensure glow doesn't affect card readability

#### Services.tsx
- Replace hardcoded URLs with dynamic booking widget (Phase 5)
- Add "Book Now" button → opens BookingWidget
- Show next available slot

#### Navigation.tsx
- Add cart icon with badge (item count) - Phase 3
- Add "My Orders" link for authenticated users - Phase 6

---

## Security Considerations

### Token Security
- Store Square access tokens **encrypted** in database
- Never expose tokens to client-side code
- Use environment variables for application ID only

### Payment Security
- Use Web Payments SDK (tokenization only)
- Never handle raw card numbers
- PCI compliance through Square

### Webhook Security
- Validate Square webhook signatures
- Reject unsigned/invalid payloads
- Log all webhook events

### Environment Variables
```env
SQUARE_APPLICATION_ID=       # Safe for client
SQUARE_LOCATION_ID=          # Safe for client
SQUARE_ENVIRONMENT=sandbox   # or "production"
SQUARE_WEBHOOK_SIGNATURE_KEY= # Server only
ENCRYPTION_KEY=              # For token encryption
```

---

## Testing Strategy

### Unit Tests
- Cart operations (add, update, remove, clear)
- Price calculations (subtotal, tax, total)
- Inventory checks
- Order status transitions

### Integration Tests
- Square API mocking
- Full checkout flow
- Booking flow
- Webhook handlers

### E2E Tests (Playwright)
- Add to cart → Checkout → Payment (sandbox)
- Service selection → Book appointment
- Order history viewing
- Admin catalog sync

### Sandbox Testing
- Use Square Sandbox environment
- Test card: `4532 0123 4567 8901`
- Test all error scenarios

---

## Rollout Plan

### Stage 1: Development
- All work in Square Sandbox
- Feature flags for new functionality
- Admin-only testing

### Stage 2: Beta
- Enable for select users
- Monitor error rates
- Gather feedback

### Stage 3: Production
- Switch to Square Production
- Gradual rollout
- Monitor metrics

### Stage 4: Optimization
- Performance tuning
- UX refinements
- Additional payment methods

---

## Execution Checklist for Codex

### Phase 1 Tasks
- [ ] `npm install square react-square-web-payments-sdk`
- [ ] Create `server/services/square.ts`
- [ ] Create `server/services/squareAuth.ts`
- [ ] Add Prisma migrations for all new models
- [ ] Run `npx prisma migrate dev`
- [ ] Create Square OAuth endpoints
- [ ] Add encryption utilities for tokens
- [ ] Update `.env.example` with Square variables

### Phase 2 Tasks
- [ ] Create `server/services/catalogSync.ts`
- [ ] Create `/api/square/catalog/*` endpoints
- [ ] Add webhook handler for `catalog.version.updated`
- [ ] Add Square fields to ProductsManagement admin UI
- [ ] Create sync button in admin

### Phase 3 Tasks
- [ ] Create `client/src/contexts/CartContext.tsx`
- [ ] Create cart API endpoints
- [ ] Build `CartDrawer` component
- [ ] Build `AddToCartButton` component
- [ ] Update `FragranceCard` with cart button
- [ ] Create `/cart` page
- [ ] Add cart icon to Navigation

### Phase 4 Tasks
- [ ] Create `/checkout` page
- [ ] Implement `PaymentForm` with Web Payments SDK
- [ ] Create `/api/checkout/*` endpoints
- [ ] Create `/api/orders/*` endpoints
- [ ] Build `OrderConfirmation` component
- [ ] Add payment webhooks
- [ ] Create `/checkout/success` page

### Phase 5 Tasks
- [ ] Create `/api/bookings/*` endpoints
- [ ] Build `AvailabilityCalendar` component
- [ ] Build `BookingWidget` component
- [ ] Update `Services` component with booking
- [ ] Create `/book` page
- [ ] Add booking webhooks

### Phase 6 Tasks
- [ ] Create `/orders` page
- [ ] Create `/orders/:id` page
- [ ] Add Orders tab to admin dashboard
- [ ] Add booking calendar to admin
- [ ] Implement inventory alerts
- [ ] Add customer order lookup

---

## References

- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Commerce APIs](https://developer.squareup.com/docs/commerce)
- [Square Checkout API](https://developer.squareup.com/docs/checkout-api)
- [Square Catalog API](https://developer.squareup.com/docs/catalog-api/what-it-does)
- [Square Inventory API](https://developer.squareup.com/docs/inventory-api/what-it-does)
- [Square Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Square Bookings API](https://developer.squareup.com/docs/bookings-api/what-it-is)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [React Square Web Payments SDK](https://www.npmjs.com/package/react-square-web-payments-sdk)

---

---

# WHAT TO DO WITH CUSTOMER DATA

## Recommended Customer Model Expansion

```prisma
model Customer {
  id              String    @id @default(cuid())
  supabaseUserId  String    @unique
  email           String    @unique
  firstName       String?
  lastName        String?
  phone           String?
  addresses       Address[]
  orders          Order[]
  bookings        Booking[]
  preferences     Json?     // notification settings, etc.
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("customers")
}

model Address {
  id          String    @id @default(cuid())
  customerId  String
  customer    Customer  @relation(fields: [customerId], references: [id])
  type        String    // "billing" | "shipping"
  line1       String
  line2       String?
  city        String
  state       String
  zip         String
  country     String    @default("US")
  isDefault   Boolean   @default(false)

  @@map("addresses")
}
```

## What Data We CAN Store (PCI Compliant)

| Data | Store Locally? | Notes |
|------|----------------|-------|
| Name, email, phone | YES | Customer profile |
| Shipping addresses | YES | For fulfillment |
| Billing addresses | YES | For invoices |
| Order history | YES | With Square order IDs |
| Order items/totals | YES | For history display |
| Credit card numbers | NO | Square handles PCI |
| CVV/security codes | NO | Never store |
| Full card details | NO | Use Square tokens |
| Payment method last 4 | YES | For display only |
| Square customer ID | YES | For API lookups |

## Customer Account Features to Add

1. **Registration/Login** - Supabase Auth (already configured)
2. **Profile Management** - Name, email, phone, addresses
3. **Order History** - View past orders with status
4. **Booking History** - View upcoming/past appointments
5. **Reorder** - Quick reorder from history
6. **Wishlist** (optional) - Save products for later

---

# ADMIN DASHBOARD CONTROL STRATEGY

## Current Tabs (9)
1. Gallery - COMPLETE
2. Branding - COMPLETE
3. Assets - COMPLETE
4. Testimonials - COMPLETE (+ Google import)
5. Services - COMPLETE
6. Products - COMPLETE
7. Blog - COMPLETE
8. FAQ - COMPLETE
9. Messages - COMPLETE (read-only)

## Recommended New Tabs

### Tab 10: Square Integration
- Connection status indicator
- OAuth connect/disconnect buttons
- Last sync timestamp
- Manual sync trigger button
- Sync error log viewer
- Environment indicator (sandbox/production)

### Tab 11: Orders
- Order list with filters (status, date, customer)
- Order detail view
- Status update (fulfilled, shipped, refunded)
- Square order link
- Refund processing

### Tab 12: Bookings
- Booking calendar view
- Upcoming appointments list
- Booking status management
- Customer contact info
- Reschedule/cancel functionality

### Tab 13: Customers
- Customer list
- Customer detail (orders, bookings, addresses)
- Admin notes
- Customer search

### Tab 14: Inventory (optional)
- Product stock levels
- Low stock alerts
- Inventory adjustment
- Sync status

## Control Strategy: Square as Source of Truth

```
┌─────────────────────────────────────────────────────────┐
│                  CONTROL FLOW                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SQUARE DASHBOARD              MILLAN ADMIN DASHBOARD   │
│  ─────────────────             ─────────────────────    │
│  ✓ Set prices                  ✓ Toggle visibility      │
│  ✓ Manage inventory            ✓ Set featured products  │
│  ✓ Process refunds             ✓ Reorder display        │
│  ✓ View analytics              ✓ Manage content (blog,  │
│  ✓ Manage team                    FAQ, gallery, etc.)   │
│                                ✓ View orders/bookings   │
│         │                      ✓ Customer lookup        │
│         │                               │               │
│         └───────────┬───────────────────┘               │
│                     │                                   │
│                     ▼                                   │
│              SYNC MECHANISM                             │
│              (Webhooks + Polling)                       │
│                     │                                   │
│                     ▼                                   │
│              SUPABASE DATABASE                          │
│              (Operational Mirror)                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## What Admin Controls Where

| Control | Square | Millan Admin |
|---------|--------|--------------|
| Product prices | ✓ Primary | Read-only display |
| Inventory levels | ✓ Primary | Read-only display |
| Product visibility | Sync | ✓ Toggle on/off |
| Featured products | - | ✓ Set featured |
| Product order | - | ✓ Drag/drop |
| Product images | ✓ Primary | Override option |
| Service pricing | ✓ Primary | Read-only |
| Service booking | ✓ Primary | View/manage |
| Blog posts | - | ✓ Full control |
| FAQs | - | ✓ Full control |
| Testimonials | - | ✓ Full control |
| Gallery | - | ✓ Full control |
| Branding | - | ✓ Full control |

---

# RECOMMENDED ARCHITECTURE DECISIONS

## 1. Keep Square as Pricing Source of Truth
- Prices come FROM Square, not TO Square
- Admin dashboard shows prices read-only
- Client updates prices in Square Dashboard only
- Prevents price conflicts and audit issues

## 2. Use Supabase for Operational Data
- Carts (temporary, session-based)
- Orders (permanent record with Square IDs)
- Bookings (permanent record with Square IDs)
- Customer profiles (linked to Supabase Auth)
- Content (blog, FAQ, gallery, testimonials)

## 3. Implement Bidirectional Sync
- Square → Supabase: Catalog, prices, inventory (webhooks)
- Supabase → Square: Nothing (read-only integration)
- Exception: Order creation goes Supabase → Square

## 4. Session-Based Carts (Not User-Based)
- Cart stored in session/localStorage
- Converts to Order on checkout
- Prevents abandoned cart clutter in DB
- Optional: Email recovery for logged-in users

## 5. Unified Webhook Handler
```typescript
POST /api/webhooks/square
├── catalog.version.updated → Refresh product cache
├── inventory.count.updated → Update stock levels
├── payment.completed → Mark order paid
├── order.fulfilled → Update order status
├── booking.created → Create booking record
└── refund.created → Mark order refunded
```

---

# FINAL RECOMMENDATIONS

## Immediate (Before Codex Finishes)

1. **Review Codex branches** - 6 branches pushed, check for conflicts
2. **Test locally** before merging anything
3. **Keep AUDIT.md updated** as source of truth

## Before Production Launch

1. Fix all 7 blockers listed above
2. Add missing database columns (migration)
3. Create Cart/Order/Booking models
4. Implement webhook handler
5. Enable Square feature flags
6. Test full checkout flow in sandbox
7. Add CSRF protection
8. Strengthen rate limiting

## After Launch

1. Add customer accounts
2. Add order history page
3. Add booking history
4. Implement analytics
5. Add email notifications
6. Performance optimization

---

**Document Version:** 3.0
**Last Updated:** January 18, 2026
**Author:** Senior Engineer Audit (Tessl-assisted)
**Executor:** Codex
