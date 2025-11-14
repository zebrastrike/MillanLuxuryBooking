import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { contactFormSchema, insertGalleryItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = contactFormSchema.parse(req.body);
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

  app.get("/api/contact", async (req, res) => {
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

  app.get("/api/contact/:id", async (req, res) => {
    try {
      const message = await storage.getContactMessage(req.params.id);
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
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery items"
      });
    }
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const item = await storage.getGalleryItem(req.params.id);
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

  app.post("/api/gallery", async (req, res) => {
    try {
      const validatedData = insertGalleryItemSchema.parse(req.body);
      const item = await storage.createGalleryItem(validatedData);
      
      res.status(201).json({
        success: true,
        message: "Gallery item created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Invalid gallery data",
          errors: error
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create gallery item"
        });
      }
    }
  });

  app.patch("/api/gallery/:id", async (req, res) => {
    try {
      // Preprocess: strip empty strings to undefined for cleaner validation
      const preprocessedBody: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string' && value.trim() === '') {
          // Empty strings become undefined (won't be included in update)
          continue;
        }
        preprocessedBody[key] = value;
      }
      
      // Validate individual fields in the update payload
      const updateSchema = z.object({
        title: z.string().min(1, "Title is required").optional(),
        imageUrl: z.string().min(1, "Image URL is required").refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        beforeImageUrl: z.string().min(1, "Image URL is required").refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        afterImageUrl: z.string().min(1, "Image URL is required").refine(
          (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
          { message: "Image URL must be a valid URL or absolute path" }
        ).optional(),
        category: z.enum(["deep-cleaning", "move-in-out", "all"]).optional(),
        order: z.number().optional()
      });
      
      const validatedData = updateSchema.parse(preprocessedBody);
      
      // Storage layer will validate the merged result maintains integrity constraints
      const item = await storage.updateGalleryItem(req.params.id, validatedData);
      
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
      if (error instanceof Error) {
        if (error.name === "ZodError") {
          res.status(400).json({
            success: false,
            message: "Invalid gallery data",
            errors: error
          });
        } else if (
          error.message.includes("Gallery item must have") ||
          error.message.includes("Order must be")
        ) {
          // Validation errors from storage layer
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

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGalleryItem(req.params.id);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
