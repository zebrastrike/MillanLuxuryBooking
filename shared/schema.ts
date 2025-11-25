import { pgTable, serial, varchar, text, integer, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export interface Asset {
  id: string;
  url: string;
  publicId: string;
  filename: string;
}

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Contact messages table
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  service: varchar("service", { length: 255 }).notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

// Gallery items table
export const galleryItems = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  imagePublicId: varchar("image_public_id", { length: 500 }),
  imageFilename: varchar("image_filename", { length: 255 }),
  beforeImageUrl: varchar("before_image_url", { length: 500 }),
  beforeImagePublicId: varchar("before_image_public_id", { length: 500 }),
  beforeImageFilename: varchar("before_image_filename", { length: 255 }),
  afterImageUrl: varchar("after_image_url", { length: 500 }),
  afterImagePublicId: varchar("after_image_public_id", { length: 500 }),
  afterImageFilename: varchar("after_image_filename", { length: 255 }),
  category: varchar("category", { length: 50 }).notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export type GalleryItem = typeof galleryItems.$inferSelect;
export type InsertGalleryItem = typeof galleryItems.$inferInsert;

// Testimonials table
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  review: text("review").notNull(),
  rating: integer("rating").notNull().default(5),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  sourceUrl: varchar("source_url", { length: 500 }),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  features: text("features").array().notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// Blog posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// Social Links table
export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  instagram: varchar("instagram", { length: 500 }),
  yelp: varchar("yelp", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type SocialLinks = typeof socialLinks.$inferSelect;
export type InsertSocialLinks = typeof socialLinks.$inferInsert;

// Google Reviews table
export const googleReviews = pgTable("google_reviews", {
  id: serial("id").primaryKey(),
  googleReviewId: varchar("google_review_id", { length: 255 }).unique(),
  author: varchar("author", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  reviewDate: timestamp("review_date").notNull(),
  featured: boolean("featured").default(false),
  syncedAt: timestamp("synced_at").defaultNow().notNull()
});

export type GoogleReview = typeof googleReviews.$inferSelect;
export type InsertGoogleReview = typeof googleReviews.$inferInsert;

// Site assets table for dynamic image references (e.g., logo, hero background)
export const siteAssets = pgTable("site_assets", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  url: varchar("url", { length: 500 }).notNull(),
  name: varchar("name", { length: 255 }),
  filename: varchar("filename", { length: 255 }),
  publicId: varchar("public_id", { length: 500 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SiteAsset = typeof siteAssets.$inferSelect;
export type InsertSiteAsset = typeof siteAssets.$inferInsert;

// Zod schemas for validation
export const insertContactMessageSchema = createInsertSchema(contactMessages, {
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters")
}).omit({ id: true, timestamp: true });

// Helper to convert empty strings to undefined for optional fields
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === "" ? undefined : val), schema);

const imageUrlValidator = z.string().min(1, "Image URL is required").refine(
  (val) => val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
  { message: "Image URL must be a valid URL or absolute path" }
);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugValidator = z
  .string()
  .min(1, "Slug is required")
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => slugRegex.test(value), {
    message: "Slug must be URL-safe (lowercase letters, numbers, and hyphens)",
  });

export const testimonialSourceSchema = z.enum(["manual", "google", "thumbtack"]);

export const insertGalleryItemSchema = createInsertSchema(galleryItems, {
  title: z.string().min(1, "Title is required"),
  imageUrl: emptyToUndefined(imageUrlValidator.optional()),
  imagePublicId: emptyToUndefined(z.string().optional()),
  imageFilename: emptyToUndefined(z.string().optional()),
  beforeImageUrl: emptyToUndefined(imageUrlValidator.optional()),
  beforeImagePublicId: emptyToUndefined(z.string().optional()),
  beforeImageFilename: emptyToUndefined(z.string().optional()),
  afterImageUrl: emptyToUndefined(imageUrlValidator.optional()),
  afterImagePublicId: emptyToUndefined(z.string().optional()),
  afterImageFilename: emptyToUndefined(z.string().optional()),
  category: z.enum(["deep-cleaning", "move-in-out", "all"])
}).omit({ id: true, createdAt: true, order: true }).superRefine((data, ctx) => {
  const hasImageUrl = data.imageUrl !== undefined;
  const hasBeforeAfter = data.beforeImageUrl !== undefined && data.afterImageUrl !== undefined;
  
  if (!hasImageUrl && !hasBeforeAfter) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must provide either imageUrl or both beforeImageUrl and afterImageUrl",
      path: ["root"],
    });
  }
});

export const insertTestimonialSchema = createInsertSchema(testimonials, {
  name: z.string().min(1, "Name is required"),
  review: z.string().min(10, "Review must be at least 10 characters"),
  rating: z.number().min(1).max(5),
  source: testimonialSourceSchema.default("manual"),
  sourceUrl: emptyToUndefined(z.string().url("Source URL must be valid").optional())
}).omit({ id: true, createdAt: true, order: true });

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  features: z.array(z.string().min(1))
}).omit({ id: true, createdAt: true, order: true });

export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().min(1, "Title is required"),
  slug: slugValidator,
  excerpt: z.string().min(1, "Excerpt is required"),
  body: z.string().min(1, "Body is required"),
  published: z.boolean().optional().default(false),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Update schemas for partial updates
export const updateGalleryItemSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  imageUrl: emptyToUndefined(imageUrlValidator.optional()),
  imagePublicId: emptyToUndefined(z.string().optional()),
  imageFilename: emptyToUndefined(z.string().optional()),
  beforeImageUrl: emptyToUndefined(imageUrlValidator.optional()),
  beforeImagePublicId: emptyToUndefined(z.string().optional()),
  beforeImageFilename: emptyToUndefined(z.string().optional()),
  afterImageUrl: emptyToUndefined(imageUrlValidator.optional()),
  afterImagePublicId: emptyToUndefined(z.string().optional()),
  afterImageFilename: emptyToUndefined(z.string().optional()),
  category: z.enum(["deep-cleaning", "move-in-out", "all"]).optional()
});

export const updateTestimonialSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  review: z.string().min(10, "Review must be at least 10 characters").optional(),
  rating: z.number().min(1).max(5).optional(),
  source: testimonialSourceSchema.optional(),
  sourceUrl: emptyToUndefined(z.string().url("Source URL must be valid").optional())
});

export const updateServiceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  features: z.array(z.string().min(1)).optional()
});

export const updatePostSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  slug: slugValidator.optional(),
  excerpt: z.string().min(1, "Excerpt is required").optional(),
  body: z.string().min(1, "Body is required").optional(),
  published: z.boolean().optional(),
});

export const insertSocialLinksSchema = createInsertSchema(socialLinks, {
  instagram: z.string().url("Instagram URL must be valid").optional(),
  yelp: z.string().url("Yelp URL must be valid").optional(),
  phone: z.string().min(10, "Phone must be valid").optional(),
  email: z.string().email("Email must be valid").optional(),
  address: z.string().optional()
}).omit({ id: true, updatedAt: true });

export const insertGoogleReviewSchema = createInsertSchema(googleReviews, {
  author: z.string().min(1, "Author is required"),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, "Comment is required"),
  reviewDate: z.date().or(z.string().datetime())
}).omit({ id: true, syncedAt: true, featured: true, googleReviewId: true });

// Site assets (images, backgrounds, logos)
export const insertSiteAssetSchema = createInsertSchema(siteAssets, {
  key: z.string().min(1),
  url: imageUrlValidator,
  name: z.string().optional(),
  filename: z.string().optional(),
  publicId: z.string().optional(),
  description: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateSiteAssetSchema = z.object({
  url: imageUrlValidator.optional(),
  name: z.string().optional(),
  filename: z.string().optional(),
  publicId: z.string().optional(),
  description: z.string().optional(),
});
