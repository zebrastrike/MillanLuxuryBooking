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
  contactMessages,
  galleryItems,
  testimonials,
  services,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

// Update type for gallery items - allows updating any field including order
export type UpdateGalleryItem = Partial<Omit<GalleryItem, 'id' | 'createdAt'>>;
export type UpdateTestimonial = Partial<Omit<Testimonial, 'id' | 'createdAt'>>;
export type UpdateService = Partial<Omit<Service, 'id' | 'createdAt'>>;

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Contact messages
  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db
      .insert(contactMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.timestamp));
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [message] = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
    return message || undefined;
  }

  // Gallery items
  async createGalleryItem(itemData: InsertGalleryItem): Promise<GalleryItem> {
    const maxOrder = await db
      .select()
      .from(galleryItems)
      .orderBy(desc(galleryItems.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await db
      .insert(galleryItems)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
    return await db
      .select()
      .from(galleryItems)
      .orderBy(asc(galleryItems.order));
  }

  async getGalleryItem(id: number): Promise<GalleryItem | undefined> {
    const [item] = await db
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
    
    const [result] = await db
      .update(galleryItems)
      .set(itemData)
      .where(eq(galleryItems.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteGalleryItem(id: number): Promise<boolean> {
    const result = await db
      .delete(galleryItems)
      .where(eq(galleryItems.id, id))
      .returning();
    return result.length > 0;
  }

  // Testimonials
  async createTestimonial(itemData: InsertTestimonial): Promise<Testimonial> {
    const maxOrder = await db
      .select()
      .from(testimonials)
      .orderBy(desc(testimonials.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await db
      .insert(testimonials)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getTestimonials(): Promise<Testimonial[]> {
    return await db
      .select()
      .from(testimonials)
      .orderBy(asc(testimonials.order));
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    const [item] = await db
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
    
    const [result] = await db
      .update(testimonials)
      .set(itemData)
      .where(eq(testimonials.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning();
    return result.length > 0;
  }

  // Services
  async createService(itemData: InsertService): Promise<Service> {
    const maxOrder = await db
      .select()
      .from(services)
      .orderBy(desc(services.order))
      .limit(1);
    
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order ?? 0) + 1 : 0;
    
    const [item] = await db
      .insert(services)
      .values({ ...itemData, order: nextOrder })
      .returning();
    return item;
  }

  async getServices(): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .orderBy(asc(services.order));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [item] = await db
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
    
    const [result] = await db
      .update(services)
      .set(itemData)
      .where(eq(services.id, id))
      .returning();
    
    return result || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
