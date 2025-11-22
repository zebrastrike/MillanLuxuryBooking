import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema, insertGalleryItemSchema, insertTestimonialSchema, insertServiceSchema, updateGalleryItemSchema, updateTestimonialSchema, updateServiceSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { setupAuth, isAuthenticated, isAdmin } from "./clerkAuth";
import { put } from "@vercel/blob";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Gallery endpoints
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await storage.getGalleryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  app.post("/api/gallery", isAdmin, async (req, res) => {
    try {
      const validatedData = insertGalleryItemSchema.parse(req.body);
      const item = await storage.createGalleryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid gallery item data" });
      } else {
        console.error("Error creating gallery item:", error);
        res.status(500).json({ message: "Failed to create gallery item" });
      }
    }
  });

  app.put("/api/gallery/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateGalleryItemSchema.parse(req.body);
      const item = await storage.updateGalleryItem(id, validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid gallery item data" });
      } else {
        console.error("Error updating gallery item:", error);
        res.status(500).json({ message: "Failed to update gallery item" });
      }
    }
  });

  app.delete("/api/gallery/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGalleryItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gallery item:", error);
      res.status(500).json({ message: "Failed to delete gallery item" });
    }
  });

  // File upload endpoint for Vercel Blob - Protected with Clerk auth
  app.post("/api/upload", isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file provided"
        });
        return;
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.status(400).json({
          success: false,
          message: "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads."
        });
        return;
      }

      const filename = `gallery/${Date.now()}-${req.file.originalname}`;
      
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      res.json({
        success: true,
        data: { url: blob.url }
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload file"
      });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(validatedData);
      
      res.status(201).json({
        success: true,
        message: "Contact form submitted successfully",
        data: message
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Invalid form data",
          errors: error
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to submit contact form"
        });
      }
    }
  });

  app.get("/api/contact", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact messages"
      });
    }
  });

  app.get("/api/contact/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const message = await storage.getContactMessage(id);
      if (!message) {
        res.status(404).json({
          success: false,
          message: "Contact message not found"
        });
        return;
      }
      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact message"
      });
    }
  });

  // Gallery endpoints
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await storage.getGalleryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery items"
      });
    }
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const item = await storage.getGalleryItem(id);
      if (!item) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery item"
      });
    }
  });

  app.post("/api/gallery", isAdmin, async (req, res) => {
    try {
      const validatedData = insertGalleryItemSchema.parse(req.body);
      const item = await storage.createGalleryItem(validatedData);
      
      res.status(201).json({
        success: true,
        message: "Gallery item created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid gallery data",
          errors: { issues: error.issues }
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create gallery item"
        });
      }
    }
  });

  app.patch("/api/gallery/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      // Preprocess: strip empty strings to undefined
      const preprocessedBody: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string' && value.trim() === '') {
          continue;
        }
        preprocessedBody[key] = value;
      }
      
      const updateSchema = z.object({
        title: z.string().min(1, "Title is required").optional(),
        imageUrl: z.string().min(1).refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        beforeImageUrl: z.string().min(1).refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        afterImageUrl: z.string().min(1).refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        category: z.enum(["deep-cleaning", "move-in-out", "all"]).optional(),
        order: z.number().optional()
      });
      
      const validatedData = updateSchema.parse(preprocessedBody);
      const item = await storage.updateGalleryItem(id, validatedData);
      
      if (!item) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Gallery item updated successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid gallery data",
          errors: { issues: error.issues }
        });
      } else if (error instanceof Error) {
        if (
          error.message.includes("Gallery item must have") ||
          error.message.includes("Order must be")
        ) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Failed to update gallery item"
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update gallery item"
        });
      }
    }
  });

  app.delete("/api/gallery/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const deleted = await storage.deleteGalleryItem(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Gallery item deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete gallery item"
      });
    }
  });

  // Testimonials endpoints
  app.get("/api/testimonials", async (req, res) => {
    try {
      const items = await storage.getTestimonials();
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve testimonials"
      });
    }
  });

  app.post("/api/testimonials", isAdmin, async (req, res) => {
    try {
      const validatedData = insertTestimonialSchema.parse(req.body);
      const item = await storage.createTestimonial(validatedData);
      
      res.status(201).json({
        success: true,
        message: "Testimonial created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Invalid testimonial data",
          errors: error
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create testimonial"
        });
      }
    }
  });

  app.patch("/api/testimonials/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const item = await storage.updateTestimonial(id, req.body);
      
      if (!item) {
        res.status(404).json({
          success: false,
          message: "Testimonial not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Testimonial updated successfully",
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update testimonial"
      });
    }
  });

  app.delete("/api/testimonials/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const deleted = await storage.deleteTestimonial(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Testimonial not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Testimonial deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete testimonial"
      });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const items = await storage.getServices();
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve services"
      });
    }
  });

  app.post("/api/services", isAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const item = await storage.createService(validatedData);
      
      res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Invalid service data",
          errors: error
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create service"
        });
      }
    }
  });

  app.patch("/api/services/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const item = await storage.updateService(id, req.body);
      
      if (!item) {
        res.status(404).json({
          success: false,
          message: "Service not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Service updated successfully",
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update service"
      });
    }
  });

  app.delete("/api/services/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const deleted = await storage.deleteService(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Service not found"
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Service deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete service"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
