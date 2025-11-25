import {
  type ContactMessage,
  type InsertContactMessage,
  type GalleryItem,
  type InsertGalleryItem,
  type Testimonial,
  type InsertTestimonial,
  type Service,
  type InsertService,
  type User,
  type UpsertUser,
  type SiteAsset,
  type InsertSiteAsset,
  siteAssets,
  contactMessages,
  galleryItems,
  testimonials,
  services,
  users,
} from "@shared/schema";
import { db, hasDatabaseUrl } from "./db";
import { eq, desc, asc } from "drizzle-orm";

// Update type for gallery items - allows updating any field including order
export type UpdateGalleryItem = Partial<Omit<GalleryItem, 'id' | 'createdAt'>>;
export type UpdateTestimonial = Partial<Omit<Testimonial, 'id' | 'createdAt'>>;
export type UpdateService = Partial<Omit<Service, 'id' | 'createdAt'>>;
export type UpdateSiteAsset = Partial<Omit<SiteAsset, 'id' | 'createdAt' | 'updatedAt'>>;

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  
  // Gallery items
  createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem>;
  getGalleryItems(): Promise<GalleryItem[]>;
  getGalleryItem(id: number): Promise<GalleryItem | undefined>;
  updateGalleryItem(id: number, item: UpdateGalleryItem): Promise<GalleryItem | undefined>;
  deleteGalleryItem(id: number): Promise<boolean>;
  
  // Testimonials
  createTestimonial(item: InsertTestimonial): Promise<Testimonial>;
  getTestimonials(): Promise<Testimonial[]>;
  getTestimonial(id: number): Promise<Testimonial | undefined>;
  updateTestimonial(id: number, item: UpdateTestimonial): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;
  
  // Services
  createService(item: InsertService): Promise<Service>;
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  updateService(id: number, item: UpdateService): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Site assets
  upsertSiteAsset(asset: InsertSiteAsset): Promise<SiteAsset>;
  getSiteAssets(): Promise<SiteAsset[]>;
  getSiteAssetByKey(key: string): Promise<SiteAsset | undefined>;
}

function assertDb() {
  if (!db) {
    throw new Error("Database connection is not configured. Set DATABASE_URL to enable Postgres storage.");
  }

  return db;
}

export class DatabaseStorage implements IStorage {
  private db = assertDb();

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          isAdmin: userData.isAdmin,
        },
      })
      .returning();
    return user;
  }

  // Contact messages
  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await this.db
      .insert(contactMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await this.db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.timestamp));
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [message] = await this.db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
    return message || undefined;
  }

  // Gallery items
  async createGalleryItem(itemData: InsertGalleryItem): Promise<GalleryItem> {
    const maxOrder = await this.db
      .select()
      .from(galleryItems)
      .orderBy(desc(galleryItems.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await this.db
      .insert(galleryItems)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
    return await this.db
      .select()
      .from(galleryItems)
      .orderBy(asc(galleryItems.order));
  }

  async getGalleryItem(id: number): Promise<GalleryItem | undefined> {
    const [item] = await this.db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.id, id));
    return item || undefined;
  }

  async updateGalleryItem(id: number, itemData: UpdateGalleryItem): Promise<GalleryItem | undefined> {
    const existing = await this.getGalleryItem(id);
    if (!existing) return undefined;
    
    // Validate order if provided
    if (itemData.order !== undefined && (typeof itemData.order !== 'number' || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }
    
    // Create the merged result
    const updated = {
      ...existing,
      ...itemData
    };
    
    // Validate the merged result maintains the integrity constraint
    const hasValidImageUrl = updated.imageUrl && updated.imageUrl.trim().length > 0;
    const hasValidBeforeAfter = 
      updated.beforeImageUrl && updated.beforeImageUrl.trim().length > 0 &&
      updated.afterImageUrl && updated.afterImageUrl.trim().length > 0;
    
    if (!hasValidImageUrl && !hasValidBeforeAfter) {
      throw new Error("Gallery item must have either imageUrl or both beforeImageUrl and afterImageUrl");
    }
    
    const [result] = await this.db
      .update(galleryItems)
      .set(itemData)
      .where(eq(galleryItems.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteGalleryItem(id: number): Promise<boolean> {
    const result = await this.db
      .delete(galleryItems)
      .where(eq(galleryItems.id, id))
      .returning();
    return result.length > 0;
  }

  // Testimonials
  async createTestimonial(itemData: InsertTestimonial): Promise<Testimonial> {
    const maxOrder = await this.db
      .select()
      .from(testimonials)
      .orderBy(desc(testimonials.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await this.db
      .insert(testimonials)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getTestimonials(): Promise<Testimonial[]> {
    return await this.db
      .select()
      .from(testimonials)
      .orderBy(asc(testimonials.order));
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    const [item] = await this.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id));
    return item || undefined;
  }

  async updateTestimonial(id: number, itemData: UpdateTestimonial): Promise<Testimonial | undefined> {
    const existing = await this.getTestimonial(id);
    if (!existing) return undefined;
    
    if (itemData.order !== undefined && (typeof itemData.order !== 'number' || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }
    
    const [result] = await this.db
      .update(testimonials)
      .set(itemData)
      .where(eq(testimonials.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await this.db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning();
    return result.length > 0;
  }

  // Services
  async createService(itemData: InsertService): Promise<Service> {
    const maxOrder = await this.db
      .select()
      .from(services)
      .orderBy(desc(services.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await this.db
      .insert(services)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getServices(): Promise<Service[]> {
    return await this.db
      .select()
      .from(services)
      .orderBy(asc(services.order));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [item] = await this.db
      .select()
      .from(services)
      .where(eq(services.id, id));
    return item || undefined;
  }

  async updateService(id: number, itemData: UpdateService): Promise<Service | undefined> {
    const existing = await this.getService(id);
    if (!existing) return undefined;
    
    if (itemData.order !== undefined && (typeof itemData.order !== 'number' || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }
    
    const [result] = await this.db
      .update(services)
      .set(itemData)
      .where(eq(services.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await this.db
      .delete(services)
      .where(eq(services.id, id))
      .returning();
    return result.length > 0;
  }

  // Site assets
  async upsertSiteAsset(assetData: InsertSiteAsset): Promise<SiteAsset> {
    const updatePayload: Partial<InsertSiteAsset> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (assetData.url !== undefined) updatePayload.url = assetData.url;
    if (assetData.name !== undefined) updatePayload.name = assetData.name;
    if (assetData.filename !== undefined) updatePayload.filename = assetData.filename;
    if (assetData.publicId !== undefined) updatePayload.publicId = assetData.publicId;
    if (assetData.description !== undefined) updatePayload.description = assetData.description;

    const [asset] = await this.db
      .insert(siteAssets)
      .values(assetData)
      .onConflictDoUpdate({
        target: siteAssets.key,
        set: updatePayload,
      })
      .returning();
    return asset;
  }

  async getSiteAssets(): Promise<SiteAsset[]> {
    return await this.db.select().from(siteAssets).orderBy(asc(siteAssets.key));
  }

  async getSiteAssetByKey(key: string): Promise<SiteAsset | undefined> {
    const [asset] = await this.db.select().from(siteAssets).where(eq(siteAssets.key, key));
    return asset || undefined;
  }
}

class InMemoryStorage implements IStorage {
  private galleryId = 1;
  private testimonialId = 1;
  private serviceId = 1;
  private contactId = 1;
  private users: User[] = [];
  private gallery: GalleryItem[] = [];
  private testimonialsData: Testimonial[] = [];
  private servicesData: Service[] = [];
  private contactMessagesData: ContactMessage[] = [];
  private siteAssetsData: SiteAsset[] = [];

  constructor() {
      const defaultAssets: Array<Omit<SiteAsset, "id" | "createdAt" | "updatedAt">> = [
        {
          key: "logo",
          url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/millan-logo.png",
          name: "Millan Logo",
          filename: "millan-logo.png",
          publicId: "static/millan-logo.png",
          description: "Primary logo"
        },
        {
          key: "heroBackground",
          url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png",
          name: "Hero Botanical Background",
          filename: "dark-botanical-bg.png",
          publicId: "static/dark-botanical-bg.png",
          description: "Hero botanical background"
        },
        {
          key: "servicesBackground",
          url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png",
          name: "Services Background",
          filename: "dark-botanical-bg.png",
          publicId: "static/dark-botanical-bg.png",
          description: "Services background"
        },
        {
          key: "aboutBackground",
          url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/light-botanical-bg.png",
          name: "About Background",
          filename: "light-botanical-bg.png",
          publicId: "static/light-botanical-bg.png",
          description: "About background"
        },
        {
          key: "aboutPortrait",
          url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/owner-photo.jpg",
          name: "Owner Portrait",
          filename: "owner-photo.jpg",
          publicId: "static/owner-photo.jpg",
          description: "Owner portrait"
        },
      ];

    let seedId = 1;
    for (const asset of defaultAssets) {
      this.siteAssetsData.push({
        ...asset,
        id: seedId++,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = this.users.find((u) => u.id === userData.id);
    if (existing) {
      Object.assign(existing, {
        ...userData,
        updatedAt: new Date(),
      });
      return existing;
    }

    const newUser: User = {
      ...userData,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      isAdmin: userData.isAdmin ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  // Contact messages
  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const message: ContactMessage = {
      ...messageData,
      id: this.contactId++,
      timestamp: new Date(),
    };
    this.contactMessagesData.push(message);
    return message;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return [...this.contactMessagesData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    return this.contactMessagesData.find((m) => m.id === id);
  }

  // Gallery items
  async createGalleryItem(itemData: InsertGalleryItem): Promise<GalleryItem> {
    const maxOrder = this.gallery.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
    const nextOrder = maxOrder + 1;

    const item: GalleryItem = {
      ...itemData,
      id: this.galleryId++,
      order: nextOrder,
      createdAt: new Date(),
      imageUrl: itemData.imageUrl ?? null,
      imagePublicId: itemData.imagePublicId ?? null,
      imageFilename: itemData.imageFilename ?? null,
      beforeImageUrl: itemData.beforeImageUrl ?? null,
      beforeImagePublicId: itemData.beforeImagePublicId ?? null,
      beforeImageFilename: itemData.beforeImageFilename ?? null,
      afterImageUrl: itemData.afterImageUrl ?? null,
      afterImagePublicId: itemData.afterImagePublicId ?? null,
      afterImageFilename: itemData.afterImageFilename ?? null,
    };

    this.gallery.push(item);
    return item;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
    return [...this.gallery].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getGalleryItem(id: number): Promise<GalleryItem | undefined> {
    return this.gallery.find((item) => item.id === id);
  }

  async updateGalleryItem(id: number, itemData: UpdateGalleryItem): Promise<GalleryItem | undefined> {
    const existing = await this.getGalleryItem(id);
    if (!existing) return undefined;

    if (itemData.order !== undefined && (typeof itemData.order !== "number" || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }

    const updated: GalleryItem = {
      ...existing,
      ...itemData,
    };

    const hasValidImageUrl = updated.imageUrl && updated.imageUrl.trim().length > 0;
    const hasValidBeforeAfter =
      updated.beforeImageUrl && updated.beforeImageUrl.trim().length > 0 &&
      updated.afterImageUrl && updated.afterImageUrl.trim().length > 0;

    if (!hasValidImageUrl && !hasValidBeforeAfter) {
      throw new Error("Gallery item must have either imageUrl or both beforeImageUrl and afterImageUrl");
    }

    Object.assign(existing, updated);
    return existing;
  }

  async deleteGalleryItem(id: number): Promise<boolean> {
    const before = this.gallery.length;
    this.gallery = this.gallery.filter((item) => item.id !== id);
    return this.gallery.length < before;
  }

  // Testimonials
  async createTestimonial(itemData: InsertTestimonial): Promise<Testimonial> {
    const maxOrder = this.testimonialsData.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
    const nextOrder = maxOrder + 1;

    const item: Testimonial = {
      ...itemData,
      id: this.testimonialId++,
      order: nextOrder,
      createdAt: new Date(),
      rating: itemData.rating ?? 5,
    };

    this.testimonialsData.push(item);
    return item;
  }

  async getTestimonials(): Promise<Testimonial[]> {
    return [...this.testimonialsData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    return this.testimonialsData.find((item) => item.id === id);
  }

  async updateTestimonial(id: number, itemData: UpdateTestimonial): Promise<Testimonial | undefined> {
    const existing = await this.getTestimonial(id);
    if (!existing) return undefined;

    Object.assign(existing, itemData);
    return existing;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const before = this.testimonialsData.length;
    this.testimonialsData = this.testimonialsData.filter((item) => item.id !== id);
    return this.testimonialsData.length < before;
  }

  // Services
  async createService(itemData: InsertService): Promise<Service> {
    const maxOrder = this.servicesData.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
    const nextOrder = maxOrder + 1;

    const item: Service = {
      ...itemData,
      id: this.serviceId++,
      order: nextOrder,
      createdAt: new Date(),
    };

    this.servicesData.push(item);
    return item;
  }

  async getServices(): Promise<Service[]> {
    return [...this.servicesData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.servicesData.find((item) => item.id === id);
  }

  async updateService(id: number, itemData: UpdateService): Promise<Service | undefined> {
    const existing = await this.getService(id);
    if (!existing) return undefined;

    if (itemData.order !== undefined && (typeof itemData.order !== "number" || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }

    Object.assign(existing, itemData);
    return existing;
  }

  async deleteService(id: number): Promise<boolean> {
    const before = this.servicesData.length;
    this.servicesData = this.servicesData.filter((item) => item.id !== id);
    return this.servicesData.length < before;
  }

  // Site assets
  async upsertSiteAsset(assetData: InsertSiteAsset): Promise<SiteAsset> {
    const existing = this.siteAssetsData.find((asset) => asset.key === assetData.key);
    if (existing) {
      Object.assign(
        existing,
        {
          updatedAt: new Date(),
        },
        assetData.url !== undefined ? { url: assetData.url } : {},
        assetData.name !== undefined ? { name: assetData.name } : {},
        assetData.filename !== undefined ? { filename: assetData.filename ?? null } : {},
        assetData.publicId !== undefined ? { publicId: assetData.publicId ?? null } : {},
        assetData.description !== undefined ? { description: assetData.description ?? null } : {},
      );
      return existing;
    }

    const asset: SiteAsset = {
      ...assetData,
      id: this.siteAssetsData.length + 1,
      name: assetData.name ?? assetData.key,
      filename: assetData.filename ?? assetData.name ?? assetData.key,
      publicId: assetData.publicId ?? null,
      description: assetData.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.siteAssetsData.push(asset);
    return asset;
  }

  async getSiteAssets(): Promise<SiteAsset[]> {
    return [...this.siteAssetsData].sort((a, b) => a.key.localeCompare(b.key));
  }

  async getSiteAssetByKey(key: string): Promise<SiteAsset | undefined> {
    return this.siteAssetsData.find((asset) => asset.key === key);
  }
}

const storageImpl = hasDatabaseUrl ? new DatabaseStorage() : new InMemoryStorage();

if (!hasDatabaseUrl) {
  console.warn("[WARN] DATABASE_URL not set. Using in-memory storage; data will reset on restart.");
}

export const storage = storageImpl;
