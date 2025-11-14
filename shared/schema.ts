import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  beforeImageUrl: varchar("before_image_url", { length: 500 }),
  afterImageUrl: varchar("after_image_url", { length: 500 }),
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

// Zod schemas for validation
export const insertContactMessageSchema = createInsertSchema(contactMessages, {
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters")
}).omit({ id: true, timestamp: true });

const imageUrlValidator = z.string().min(1, "Image URL is required").refine(
  (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
  { message: "Image URL must be a valid URL or absolute path" }
);

export const insertGalleryItemSchema = createInsertSchema(galleryItems, {
  title: z.string().min(1, "Title is required"),
  imageUrl: imageUrlValidator.optional(),
  beforeImageUrl: imageUrlValidator.optional(),
  afterImageUrl: imageUrlValidator.optional(),
  category: z.enum(["deep-cleaning", "move-in-out", "all"])
}).omit({ id: true, createdAt: true, order: true }).refine(
  (data) => data.imageUrl || (data.beforeImageUrl && data.afterImageUrl),
  { message: "Must provide either imageUrl or both beforeImageUrl and afterImageUrl" }
);

export const insertTestimonialSchema = createInsertSchema(testimonials, {
  name: z.string().min(1, "Name is required"),
  review: z.string().min(10, "Review must be at least 10 characters"),
  rating: z.number().min(1).max(5)
}).omit({ id: true, createdAt: true, order: true });

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  features: z.array(z.string().min(1))
}).omit({ id: true, createdAt: true, order: true });
