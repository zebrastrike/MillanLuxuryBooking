import { z } from "zod";

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  timestamp: z.string().optional()
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export interface ContactMessage extends ContactFormData {
  id: string;
  timestamp: string;
}

// Gallery schema
const imageUrlValidator = z.string().min(1, "Image URL is required").refine(
  (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
  { message: "Image URL must be a valid URL or absolute path" }
);

const galleryItemBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  // Support both single collage image (imageUrl) or separate before/after images
  imageUrl: imageUrlValidator.optional(),
  beforeImageUrl: imageUrlValidator.optional(),
  afterImageUrl: imageUrlValidator.optional(),
  category: z.enum(["deep-cleaning", "move-in-out", "all"]),
  order: z.number().optional()
});

export const galleryItemSchema = galleryItemBaseSchema.refine(
  (data) => data.imageUrl || (data.beforeImageUrl && data.afterImageUrl),
  { message: "Must provide either imageUrl or both beforeImageUrl and afterImageUrl" }
);

export const insertGalleryItemSchema = galleryItemBaseSchema.omit({ order: true }).refine(
  (data) => data.imageUrl || (data.beforeImageUrl && data.afterImageUrl),
  { message: "Must provide either imageUrl or both beforeImageUrl and afterImageUrl" }
);

export type GalleryItemData = z.infer<typeof galleryItemSchema>;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;

export interface GalleryItem extends GalleryItemData {
  id: string;
  createdAt: string;
}
