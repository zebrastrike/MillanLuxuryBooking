import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema, insertGalleryItemSchema, insertTestimonialSchema, insertServiceSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { clerkMiddleware, requireAuth, getAuth, clerkClient } from "@clerk/express";
import { put } from "@vercel/blob";
import multer from "multer";
import type { RequestHandler } from "express";

const upload = multer({ storage: multer.memoryStorage() });

const createIsAdminMiddleware = (clerkEnabled: boolean): RequestHandler => {
  return async (req, res, next) => {
    if (!clerkEnabled) {
      return next();
    }

    try {
      const auth = getAuth(req);
      
      if (!auth.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(auth.userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden - admin access required" });
      }

      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  const clerkEnabled = Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

  if (!clerkEnabled) {
    console.warn("[WARN] Clerk keys not configured. Running without authentication.");
  }

  const isAdmin = createIsAdminMiddleware(clerkEnabled);
  const requireAuthMiddleware: RequestHandler = clerkEnabled
    ? requireAuth()
    : (_req, _res, next) => next();

  // Setup Clerk middleware with configuration
  if (clerkEnabled) {
    app.use(clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    }));
  }

  // Auth routes - Get current user (with auto-provisioning)
  const adminAllowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  app.get('/api/auth/user', requireAuthMiddleware, async (req: any, res) => {
    if (!clerkEnabled) {
      const existing = await storage.getUser("dev-admin");
      const user = existing ?? await storage.upsertUser({
        id: "dev-admin",
        email: "dev@example.com",
        firstName: "Dev",
        lastName: "Admin",
        profileImageUrl: null,
        isAdmin: true,
      });
      return res.json(user);
    }

    try {
      const auth = getAuth(req);
      
      if (!auth.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Try to get existing user from database
      let user = await storage.getUser(auth.userId);
      
      // If user doesn't exist in DB, create them (first-time login)
      if (!user) {
        // Fetch full user data from Clerk
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        
        // Extract email with robust fallback logic for OAuth providers
        let email: string | null = null;
        
        // Try primaryEmailAddress first (works for most OAuth providers)
        if (clerkUser.primaryEmailAddress?.emailAddress) {
          email = clerkUser.primaryEmailAddress.emailAddress;
        } 
        // Fallback: find first non-revoked email (handles OAuth with null verification status)
        else if (clerkUser.emailAddresses?.length > 0) {
          const usableEmail = clerkUser.emailAddresses.find(e => {
            if (!e.emailAddress) return false;

            const verificationStatus = e.verification?.status as string | undefined;
            return verificationStatus !== "revoked";
          });
          if (usableEmail?.emailAddress) {
            email = usableEmail.emailAddress;
          }
        }
        
        // Reject if no usable email found
        if (!email) {
          return res.status(400).json({ 
            message: "Your account must have an email address. Please add an email in your Clerk account settings and try again." 
          });
        }
        
        // Check if this is the first user (auto-promote to admin)
        const existingUsers = await storage.getAllUsers();
        const isFirstUser = existingUsers.length === 0;
        const emailLower = email.toLowerCase();
        const inAllowlist = adminAllowlist.includes(emailLower);
        const shouldBeAdmin = isFirstUser || inAllowlist;

        // Create user record from Clerk data
        user = await storage.upsertUser({
          id: auth.userId,
          email: email,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          profileImageUrl: clerkUser.imageUrl || null,
          isAdmin: shouldBeAdmin,
        });

        if (isFirstUser) {
          console.log(`[INFO] First user created with admin privileges: ${user.email}`);
        } else if (inAllowlist) {
          console.log(`[INFO] User marked admin via ADMIN_EMAILS allowlist: ${user.email}`);
        } else {
          console.log(`[INFO] New user created: ${user.email}`);
        }
      } else {
        const emailLower = (user.email ?? "").toLowerCase();
        if (!user.isAdmin && adminAllowlist.includes(emailLower)) {
          user = await storage.upsertUser({ ...user, isAdmin: true });
          console.log(`[INFO] Existing user promoted to admin via ADMIN_EMAILS allowlist: ${user.email}`);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching/creating user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      res.json(items);
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
      res.json(items);
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
