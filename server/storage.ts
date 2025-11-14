import { type ContactMessage, type ContactFormData, type GalleryItem, type InsertGalleryItem } from "@shared/schema";
import { randomUUID } from "crypto";

// Update type for gallery items - allows updating any field including order
export type UpdateGalleryItem = Partial<Omit<GalleryItem, 'id' | 'createdAt'>>;

export interface IStorage {
  // Contact messages
  createContactMessage(message: ContactFormData): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  
  // Gallery items
  createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem>;
  getGalleryItems(): Promise<GalleryItem[]>;
  getGalleryItem(id: string): Promise<GalleryItem | undefined>;
  updateGalleryItem(id: string, item: UpdateGalleryItem): Promise<GalleryItem | undefined>;
  deleteGalleryItem(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private contactMessages: Map<string, ContactMessage>;
  private galleryItems: Map<string, GalleryItem>;

  constructor() {
    this.contactMessages = new Map();
    this.galleryItems = new Map();
    this.seedGalleryData();
  }

  // Contact messages
  async createContactMessage(messageData: ContactFormData): Promise<ContactMessage> {
    const id = randomUUID();
    const message: ContactMessage = {
      ...messageData,
      id,
      timestamp: new Date().toISOString()
    };
    this.contactMessages.set(id, message);
    return message;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    return this.contactMessages.get(id);
  }

  // Gallery items
  async createGalleryItem(itemData: InsertGalleryItem): Promise<GalleryItem> {
    const id = randomUUID();
    const item: GalleryItem = {
      ...itemData,
      id,
      order: this.galleryItems.size,
      createdAt: new Date().toISOString()
    };
    this.galleryItems.set(id, item);
    return item;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
    return Array.from(this.galleryItems.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  }

  async getGalleryItem(id: string): Promise<GalleryItem | undefined> {
    return this.galleryItems.get(id);
  }

  async updateGalleryItem(id: string, itemData: UpdateGalleryItem): Promise<GalleryItem | undefined> {
    const existing = this.galleryItems.get(id);
    if (!existing) return undefined;
    
    // Validate order if provided
    if (itemData.order !== undefined && (typeof itemData.order !== 'number' || itemData.order < 0)) {
      throw new Error("Order must be a non-negative number");
    }
    
    // Create the merged result WITHOUT mutating state yet
    const updated: GalleryItem = {
      ...existing,
      ...itemData
    };
    
    // Validate the merged result maintains the integrity constraint
    // (must have either imageUrl OR both beforeImageUrl and afterImageUrl)
    // Check for empty strings as well as undefined/null
    const hasValidImageUrl = updated.imageUrl && updated.imageUrl.trim().length > 0;
    const hasValidBeforeAfter = 
      updated.beforeImageUrl && updated.beforeImageUrl.trim().length > 0 &&
      updated.afterImageUrl && updated.afterImageUrl.trim().length > 0;
    
    if (!hasValidImageUrl && !hasValidBeforeAfter) {
      throw new Error("Gallery item must have either imageUrl or both beforeImageUrl and afterImageUrl");
    }
    
    // Only persist if validation passed
    this.galleryItems.set(id, updated);
    return updated;
  }

  async deleteGalleryItem(id: string): Promise<boolean> {
    return this.galleryItems.delete(id);
  }

  // Seed initial gallery data
  private seedGalleryData() {
    const initialGallery: Array<Omit<GalleryItem, 'id' | 'createdAt'>> = [
      {
        title: "Kitchen & Living Transformations",
        imageUrl: "/gallery/1.png",
        category: "deep-cleaning",
        order: 0
      },
      {
        title: "Bedroom & Bathroom Refresh",
        imageUrl: "/gallery/2.png",
        category: "deep-cleaning",
        order: 1
      },
      {
        title: "Complete Home Cleaning",
        imageUrl: "/gallery/3.png",
        category: "move-in-out",
        order: 2
      },
      {
        title: "Living Spaces Transformation",
        imageUrl: "/gallery/4.png",
        category: "deep-cleaning",
        order: 3
      },
      {
        title: "Kitchen & Bathroom Sparkle",
        imageUrl: "/gallery/5.png",
        category: "deep-cleaning",
        order: 4
      },
      {
        title: "Bedroom Cleaning Excellence",
        imageUrl: "/gallery/6.png",
        category: "move-in-out",
        order: 5
      }
    ];

    initialGallery.forEach(item => {
      const id = randomUUID();
      this.galleryItems.set(id, {
        ...item,
        id,
        createdAt: new Date().toISOString()
      });
    });
  }
}

export const storage = new MemStorage();
