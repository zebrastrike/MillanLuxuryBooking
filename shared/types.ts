import { z } from "zod";

export interface BlobMetadata {
  url: string;
  pathname: string;
  contentType?: string | null;
  filename?: string | null;
  size?: number | null;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  service: string;
  message: string;
  timestamp: string | Date;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  imageFilename?: string | null;
  imageMetadata?: BlobMetadata | null;
  beforeImageUrl?: string | null;
  beforeImagePublicId?: string | null;
  beforeImageFilename?: string | null;
  beforeImageMetadata?: BlobMetadata | null;
  afterImageUrl?: string | null;
  afterImagePublicId?: string | null;
  afterImageFilename?: string | null;
  afterImageMetadata?: BlobMetadata | null;
  order?: number | null;
  createdAt: string | Date;
}

export interface ServiceItem {
  id: number;
  title: string;
  name?: string;
  description: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  iconMetadata?: BlobMetadata | null;
  imageMetadata?: BlobMetadata | null;
  features?: string[];
  order?: number | null;
  createdAt: string | Date;
  price?: number | null;
  displayPrice?: boolean;
  isVisible?: boolean;
}

export interface Testimonial {
  id: number;
  author: string;
  name?: string;
  rating: number;
  content: string;
  review?: string;
  createdAt: string | Date;
  source?: string | null;
  sourceUrl?: string | null;
  order?: number | null;

  // Google OAuth integration
  externalId?: string | null;
  isApproved?: boolean;
  importedAt?: string | Date | null;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  order?: number | null;
  createdAt: string | Date;
  isVisible?: boolean;
}

export interface BrandingAsset {
  id: number;
  logoUrl?: string | null;
  heroCrownUrl?: string | null;
  backgroundUrl?: string | null;
  logoMetadata?: BlobMetadata | null;
  heroCrownMetadata?: BlobMetadata | null;
  backgroundMetadata?: BlobMetadata | null;
  updatedAt: string | Date;
}

export interface SiteAsset {
  id: number;
  key: string;
  url: string;
  name?: string | null;
  filename?: string | null;
  publicId?: string | null;
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Asset extends SiteAsset {
  path?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FragranceProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  fragrance: string;
  price: number;
  salePrice: number | null;
  displayPrice: boolean;
  isVisible: boolean;
  imageUrl: string | null;
  squareUrl: string;
  sku: string | null;
  featured: boolean;
  order: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const urlSchema = z.string().trim().url({ message: "Must be a valid URL" });
const optionalUrl = urlSchema.or(z.literal(""));

const optionalize = <T extends z.ZodRawShape>(shape: T) =>
  z.object(
    Object.fromEntries(
      Object.entries(shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ) as { [K in keyof T]: z.ZodOptional<T[K]> },
  );

export const createContactMessageSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});
export type CreateContactMessage = z.infer<typeof createContactMessageSchema>;

export const createGalleryItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["deep-cleaning", "move-in-out", "all"]),
  imageUrl: optionalUrl.optional(),
  imagePublicId: z.string().optional(),
  imageFilename: z.string().optional(),
  beforeImageUrl: optionalUrl.optional(),
  beforeImagePublicId: z.string().optional(),
  beforeImageFilename: z.string().optional(),
  afterImageUrl: optionalUrl.optional(),
  afterImagePublicId: z.string().optional(),
  afterImageFilename: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasPrimary = Boolean(data.imageUrl);
  const hasBeforeAfter = Boolean(data.beforeImageUrl && data.afterImageUrl);
  if (!hasPrimary && !hasBeforeAfter) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide a main image or both before/after images",
      path: ["imageUrl"],
    });
  }
});
export type CreateGalleryItem = z.infer<typeof createGalleryItemSchema>;
export const updateGalleryItemSchema = optionalize(
  (createGalleryItemSchema as any)._def.schema.shape,
);
export type UpdateGalleryItem = z.infer<typeof updateGalleryItemSchema>;

export const createServiceSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  name: z.string().min(1, "Title is required").optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  iconUrl: optionalUrl.optional(),
  imageUrl: optionalUrl.optional(),
  features: z.array(z.string().min(1)).optional(),
  price: z.number().positive("Price must be positive").optional(),
  displayPrice: z.boolean().optional(),
  isVisible: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.title && !data.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide a title or name" });
  }
});
export type CreateService = z.infer<typeof createServiceSchema>;
const serviceShape =
  (createServiceSchema as any)?._def?.schema?.shape ??
  (createServiceSchema as any)?.shape ??
  {};
export const updateServiceSchema = optionalize(serviceShape);
export type UpdateService = z.infer<typeof updateServiceSchema>;

export const createTestimonialSchema = z.object({
  author: z.string().min(1, "Author is required").optional(),
  name: z.string().min(1).optional(),
  content: z.string().min(10, "Content must be at least 10 characters").optional(),
  review: z.string().min(10).optional(),
  rating: z.number().min(1).max(5),
  source: z.string().optional(),
  sourceUrl: optionalUrl.optional(),
}).superRefine((data, ctx) => {
  if (!data.author && !data.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Author is required" });
  }
  if (!data.content && !data.review) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Content is required" });
  }
});
export type CreateTestimonial = z.infer<typeof createTestimonialSchema>;
const testimonialShape =
  (createTestimonialSchema as any)?._def?.schema?.shape ??
  (createTestimonialSchema as any)?.shape ??
  {};
export const updateTestimonialSchema = optionalize(testimonialShape);
export type UpdateTestimonial = z.infer<typeof updateTestimonialSchema>;

export const createFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  order: z.number().min(0).optional(),
  isVisible: z.boolean().optional(),
});
export type CreateFaq = z.infer<typeof createFaqSchema>;
export const updateFaqSchema = optionalize(createFaqSchema.shape);
export type UpdateFaq = z.infer<typeof updateFaqSchema>;

export const brandingAssetSchema = z.object({
  logoUrl: optionalUrl.optional(),
  heroCrownUrl: optionalUrl.optional(),
  backgroundUrl: optionalUrl.optional(),
});
export type UpdateBrandingAsset = z.infer<typeof brandingAssetSchema>;

export const insertSiteAssetSchema = z.object({
  key: z.string().min(1),
  url: urlSchema,
  name: z.string().optional(),
  filename: z.string().optional(),
  publicId: z.string().optional(),
  description: z.string().optional(),
});
export const updateSiteAssetSchema = optionalize(insertSiteAssetSchema.shape);

export const testimonialSourceSchema = z.enum(["manual", "google", "thumbtack", "yelp"]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).regex(slugRegex, "Slug must be URL-safe"),
  excerpt: z.string().min(1, "Excerpt is required"),
  body: z.string().min(1, "Body is required"),
  published: z.boolean().optional().default(false),
});
export type CreatePost = z.infer<typeof createPostSchema>;
export const updatePostSchema = optionalize(createPostSchema.shape);
export type UpdatePost = z.infer<typeof updatePostSchema>;

// Legacy aliases for existing imports
export type InsertContactMessage = CreateContactMessage;
export const insertContactMessageSchema = createContactMessageSchema;

export type InsertGalleryItem = CreateGalleryItem;
export const insertGalleryItemSchema = createGalleryItemSchema;
export const updateGalleryItemLegacySchema = updateGalleryItemSchema;

export type Service = ServiceItem;
export type InsertService = CreateService;
export const insertServiceSchema = createServiceSchema;

export type InsertTestimonial = CreateTestimonial;
export const insertTestimonialSchema = createTestimonialSchema;

export type InsertFaq = CreateFaq;
export const insertFaqSchema = createFaqSchema;

export type InsertPost = CreatePost;
export const insertPostSchema = createPostSchema;

// Product management
export const productCategorySchema = z.enum([
  "candle-3wick",
  "candle-mini",
  "candle-single",
  "car-diffuser",
  "room-spray",
  "cleaner"
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const createFragranceProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: productCategorySchema,
  fragrance: z.string().min(1, "Fragrance name is required"),
  price: z.number().positive("Price must be positive"),
  salePrice: z.number().positive("Sale price must be positive").optional(),
  displayPrice: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  imageUrl: optionalUrl.optional(),
  squareUrl: z.string().url("Must be a valid Square URL"),
  sku: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type CreateFragranceProduct = z.infer<typeof createFragranceProductSchema>;
export const updateFragranceProductSchema = optionalize(createFragranceProductSchema.shape);
export type UpdateFragranceProduct = z.infer<typeof updateFragranceProductSchema>;

export type InsertFragranceProduct = CreateFragranceProduct;
export const insertFragranceProductSchema = createFragranceProductSchema;
