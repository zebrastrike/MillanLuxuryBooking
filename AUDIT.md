# MILLAN LUXURY BOOKING - COMPREHENSIVE SYSTEM AUDIT

**Audit Date:** January 2026
**Project:** Millan Luxury Cleaning Website
**Purpose:** Full Square Store Integration for Products & Services
**Executor:** Codex

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

## Current System Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Supabase)
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

#### FragranceCard.tsx
- Replace "Shop Now" link with "Add to Cart" button
- Add inventory status indicator (In Stock / Low Stock / Out of Stock)
- Remove external link behavior

#### Services.tsx
- Replace hardcoded URLs with dynamic booking widget
- Add "Book Now" button → opens BookingWidget
- Show next available slot

#### Navigation.tsx
- Add cart icon with badge (item count)
- Add "My Orders" link for authenticated users

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

**Document Version:** 2.0
**Last Updated:** January 2026
**Author:** Architecture Audit System
**Executor:** Codex
