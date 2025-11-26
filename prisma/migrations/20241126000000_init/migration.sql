-- CreateTable User
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "profileImageUrl" TEXT,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateTable Session
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" TEXT PRIMARY KEY,
  "sess" JSONB NOT NULL,
  "expire" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_expire_idx" ON "sessions"("expire");

-- CreateTable ContactMessage
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable GalleryItem
CREATE TABLE IF NOT EXISTS "gallery_items" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "imagePublicId" TEXT,
  "imageFilename" TEXT,
  "imageMetadata" JSONB,
  "beforeImageUrl" TEXT,
  "beforeImagePublicId" TEXT,
  "beforeImageFilename" TEXT,
  "beforeImageMetadata" JSONB,
  "afterImageUrl" TEXT,
  "afterImagePublicId" TEXT,
  "afterImageFilename" TEXT,
  "afterImageMetadata" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable ServiceItem
CREATE TABLE IF NOT EXISTS "services" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "iconUrl" TEXT,
  "imageUrl" TEXT,
  "iconMetadata" JSONB,
  "imageMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT,
  "features" TEXT[] NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable Testimonial
CREATE TABLE IF NOT EXISTS "testimonials" (
  "id" SERIAL PRIMARY KEY,
  "author" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT,
  "review" TEXT,
  "source" TEXT,
  "sourceUrl" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable FaqItem
CREATE TABLE IF NOT EXISTS "faqs" (
  "id" SERIAL PRIMARY KEY,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable BrandingAsset
CREATE TABLE IF NOT EXISTS "branding_assets" (
  "id" SERIAL PRIMARY KEY,
  "logoUrl" TEXT,
  "heroCrownUrl" TEXT,
  "backgroundUrl" TEXT,
  "logoMetadata" JSONB,
  "heroCrownMetadata" JSONB,
  "backgroundMetadata" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable SiteAsset
CREATE TABLE IF NOT EXISTS "site_assets" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "url" TEXT NOT NULL,
  "name" TEXT,
  "filename" TEXT,
  "publicId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable Posts
CREATE TABLE IF NOT EXISTS "posts" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "excerpt" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
