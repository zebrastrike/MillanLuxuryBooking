import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertContactMessageSchema,
  insertGalleryItemSchema,
  insertTestimonialSchema,
  insertServiceSchema,
  insertSiteAssetSchema,
  updateGalleryItemSchema,
  updateServiceSchema,
  updateTestimonialSchema,
  updateSiteAssetSchema,
} from "@shared/schema";
import { z, ZodError } from "zod";
import { clerkMiddleware, requireAuth, getAuth, clerkClient } from "@clerk/express";
import { del, put } from "@vercel/blob";
import multer from "multer";
import type { Request, RequestHandler } from "express";
import { isAdminUser } from "@shared/auth";
import type { Asset, SiteAsset } from "@shared/schema";
import type { EnvConfig } from "./env";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const getBlobPath = (value?: string | null) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.includes("vercel-storage")) return null;
    return parsed.pathname;
  } catch {
    return value.startsWith("/") ? value : null;
  }
};

const buildAssetPayload = (asset: SiteAsset): Asset & { key: string; path: string; description: string | null } => {
  const path = getBlobPath(asset.publicId || asset.url) || "";
  const filename = asset.filename || asset.name || path.split("/").pop() || "asset";

  return {
    key: asset.key,
    url: asset.url,
    id: String(asset.id),
    path,
    publicId: asset.publicId || path,
    filename,
    description: asset.description ?? null,
  };
};

type AuthedRequest = Request & { auth?: ReturnType<typeof getAuth> | null };

const respondAuthUnavailable: RequestHandler = (_req, res) => {
  res.status(503).json({ message: "Authentication is not configured." });
};

const createRequireAdminMiddleware = (clerkEnabled: boolean): RequestHandler => {
  if (!clerkEnabled) {
    return respondAuthUnavailable;
  }

  return async (req, res, next) => {
    try {
      const authRequest = req as AuthedRequest;
      const auth = authRequest.auth ?? getAuth(authRequest);

      if (!auth?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const clerkUser = await clerkClient.users.getUser(auth.userId);
      const userRecord = await storage.getUser(auth.userId);
      const isAdmin = isAdminUser(clerkUser) || Boolean(userRecord?.isAdmin);

      if (!isAdmin) {
        return res.status(403).json({ message: "Forbidden - admin access required" });
      }

      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };
};

export async function registerRoutes(app: Express, env: EnvConfig): Promise<Server> {
  if (!env.clerkEnabled) {
    console.warn("[WARN] Clerk keys not configured. Admin access will be denied.");
  }

  const requireAdmin = createRequireAdminMiddleware(env.clerkEnabled);
  const requireAuthMiddleware: RequestHandler = env.clerkEnabled
    ? requireAuth()
    : respondAuthUnavailable;

  // Setup Clerk middleware with configuration
  if (env.clerkEnabled) {
    app.use(clerkMiddleware({
      publishableKey: env.clerk.publishableKey,
      secretKey: env.clerk.secretKey,
    }));
  }

  // Auth routes - Get current user (with auto-provisioning)
  app.get('/api/auth/user', requireAuthMiddleware, async (req: any, res) => {
    try {
      const authRequest = req as AuthedRequest;
      const auth = authRequest.auth ?? getAuth(authRequest);

      if (!auth?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Try to get existing user from database
      let user = await storage.getUser(auth.userId);

      // If user doesn't exist in DB, create them (first-time login)
      if (!user) {
        // Fetch full user data from Clerk
        const clerkUser = await clerkClient.users.getUser(auth.userId);

        const existingUsers = await storage.getAllUsers();
        const isFirstUser = existingUsers.length === 0;

        // Extract email with robust fallback logic for OAuth providers
        let email: string | null = null;
        
        // Try primaryEmailAddress first (works for most OAuth providers)
        if (clerkUser.primaryEmailAddress?.emailAddress) {
          email = clerkUser.primaryEmailAddress.emailAddress;
        } 
        // Fallback: find first non-revoked email (handles OAuth with null verification status)
        else if (clerkUser.emailAddresses?.length > 0) {
          const usableEmail = clerkUser.emailAddresses.find((e) => {
            const status = e.verification?.status as string | undefined;
            return e.emailAddress && status !== "revoked";
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

        // Create user record from Clerk data
        user = await storage.upsertUser({
          id: auth.userId,
          email: email,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          profileImageUrl: clerkUser.imageUrl || null,
          isAdmin: isFirstUser || isAdminUser(clerkUser),
        });
      } else {
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        const isAdmin = isAdminUser(clerkUser) || user.isAdmin;
        if (user.isAdmin !== isAdmin) {
          user = await storage.upsertUser({ ...user, isAdmin });
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching/creating user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // File upload endpoint for Vercel Blob - Protected with Clerk auth
  app.post("/api/upload", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file provided"
        });
        return;
      }

      if (!env.blob.token) {
        res.status(400).json({
          success: false,
          message: "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads."
        });
        return;
      }

      const filename = `gallery/${Date.now()}-${req.file.originalname}`;

      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        token: env.blob.token,
      });

      res.json({
        success: true,
        data: {
          url: blob.url,
          publicId: blob.pathname,
          path: blob.pathname,
          filename: req.file.originalname,
        }
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

  // Site assets endpoints (Vercel Blob backed)
  app.get("/api/assets", async (_req, res) => {
    try {
      const assets = await storage.getSiteAssets();
      res.json(assets.map((asset) => buildAssetPayload(asset)));
    } catch (error) {
      console.error("Failed to load site assets", error);
      res.status(500).json({ message: "Failed to load site assets" });
    }
  });

  app.post("/api/assets", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      const payload = z
        .object({
          key: z.string().min(1),
          description: z.string().optional(),
          name: z.string().optional(),
          filename: z.string().optional(),
          publicId: z.string().optional(),
          url: z.string().url().optional(),
        })
        .superRefine((val, ctx) => {
          if (!req.file && !val.url) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide a file or an existing URL" });
          }
        })
        .parse(req.body);

      if (req.file && !env.blob.token) {
        res.status(400).json({
          success: false,
          message: "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads.",
        });
        return;
      }

      const blob = req.file
        ? await put(`site-assets/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
            access: 'public',
            token: env.blob.token,
          })
        : null;

      const url = blob?.url ?? payload.url;
      if (!url) {
        res.status(400).json({ success: false, message: "Unable to resolve upload URL" });
        return;
      }

      const publicId = blob?.pathname ?? payload.publicId ?? getBlobPath(url);
      const filename = payload.filename ?? payload.name ?? req.file?.originalname ?? payload.key;

      const asset = await storage.upsertSiteAsset({
        key: payload.key,
        url,
        name: payload.name ?? filename,
        filename,
        publicId: publicId ?? undefined,
        description: payload.description,
      });

      res.status(201).json({
        success: true,
        message: "Asset saved successfully",
        data: buildAssetPayload(asset),
      });
    } catch (error) {
      console.error("Asset upload error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid asset payload", errors: error.issues });
        return;
      }
      res.status(500).json({ success: false, message: "Failed to save asset" });
    }
  });

  app.put("/api/assets/:key", requireAdmin, async (req, res) => {
    try {
      const key = req.params.key;
      const updates = updateSiteAssetSchema.parse(req.body);
      const existing = await storage.getSiteAssetByKey(key);

      if (!existing && !updates.url) {
        res.status(400).json({ success: false, message: "Provide a URL to create a new asset" });
        return;
      }

      const asset = await storage.upsertSiteAsset({
        key,
        url: updates.url ?? existing?.url ?? "",
        name: updates.name ?? existing?.name ?? key,
        filename: updates.filename ?? existing?.filename ?? existing?.name ?? key,
        publicId: updates.publicId ?? existing?.publicId ?? getBlobPath(updates.url ?? existing?.url ?? "") ?? undefined,
        description: updates.description ?? existing?.description ?? null,
      });

      res.json({ success: true, data: buildAssetPayload(asset), message: "Asset updated" });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid asset payload", errors: error.issues });
        return;
      }
      console.error("Asset update error:", error);
      res.status(500).json({ success: false, message: "Failed to update asset" });
    }
  });

  app.get("/api/contact", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact messages"
      });
    }
  });

  app.get("/api/contact/:id", requireAdmin, async (req, res) => {
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

  app.post("/api/gallery", requireAdmin, async (req, res) => {
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

  app.patch("/api/gallery/:id", requireAdmin, async (req, res) => {
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

      const validatedData = updateGalleryItemSchema.parse(preprocessedBody);
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

  app.delete("/api/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const existing = await storage.getGalleryItem(id);
      const deleted = await storage.deleteGalleryItem(id);

      if (!deleted || !existing) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }

      const blobTargets = [
        getBlobPath(existing.imagePublicId || existing.imageUrl),
        getBlobPath(existing.beforeImagePublicId || existing.beforeImageUrl),
        getBlobPath(existing.afterImagePublicId || existing.afterImageUrl),
      ].filter((path): path is string => Boolean(path));

      if (blobTargets.length > 0) {
        if (!env.blob.token) {
          console.warn("BLOB_READ_WRITE_TOKEN missing - skipped blob deletion for gallery item", id);
        } else {
          await del(blobTargets, { token: env.blob.token });
        }
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

    app.post("/api/testimonials", requireAdmin, async (req, res) => {
      try {
        const validatedData = insertTestimonialSchema.parse(req.body);
        const item = await storage.createTestimonial(validatedData);

        res.status(201).json({
          success: true,
          message: "Testimonial created successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid testimonial data",
            errors: error.issues
          });
        } else {
          console.error("Failed to create testimonial", error);
          res.status(500).json({
            success: false,
            message: "Failed to create testimonial"
          });
        }
      }
    });

    app.patch("/api/testimonials/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).json({
            success: false,
            message: "Invalid ID"
          });
          return;
        }

        const updates = updateTestimonialSchema.parse(req.body);
        const item = await storage.updateTestimonial(id, updates);

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
        if (error instanceof ZodError) {
          res.status(400).json({ success: false, message: "Invalid testimonial data", errors: error.issues });
          return;
        }
        console.error("Failed to update testimonial", error);
        res.status(500).json({
          success: false,
          message: "Failed to update testimonial"
        });
      }
    });

  app.delete("/api/testimonials/:id", requireAdmin, async (req, res) => {
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

    app.post("/api/services", requireAdmin, async (req, res) => {
      try {
        const validatedData = insertServiceSchema.parse(req.body);
        const item = await storage.createService(validatedData);

        res.status(201).json({
          success: true,
          message: "Service created successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid service data",
            errors: error.issues
          });
        } else {
          console.error("Failed to create service", error);
          res.status(500).json({
            success: false,
            message: "Failed to create service"
          });
        }
      }
    });

    app.patch("/api/services/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).json({
            success: false,
            message: "Invalid ID"
          });
          return;
        }

        const updates = updateServiceSchema.parse(req.body);
        const item = await storage.updateService(id, updates);

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
        if (error instanceof ZodError) {
          res.status(400).json({ success: false, message: "Invalid service data", errors: error.issues });
          return;
        }
        console.error("Failed to update service", error);
        res.status(500).json({
          success: false,
          message: "Failed to update service"
        });
      }
    });

  app.delete("/api/services/:id", requireAdmin, async (req, res) => {
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
