import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { Express, Request, RequestHandler, Response } from "express";
import { createServer, type Server } from "http";
import { assertPrisma, hasDatabaseUrl } from "./db/prismaClient.js";
import {
  insertContactMessageSchema,
  insertGalleryItemSchema,
  insertTestimonialSchema,
  insertServiceSchema,
  insertSiteAssetSchema,
  insertPostSchema,
  insertFaqSchema,
  updateGalleryItemSchema,
  updateServiceSchema,
  updateTestimonialSchema,
  updateSiteAssetSchema,
  updatePostSchema,
  updateFaqSchema,
  insertFragranceProductSchema,
  updateFragranceProductSchema,
} from "../shared/types.js";
import { z, ZodError } from "zod";
import multer from "multer";
import type { Asset, SiteAsset } from "../shared/types.js";
import type { EnvConfig } from "./env.js";
import { list as listBlobFiles, upload as uploadBlobFile, remove as removeBlob } from "./blobService.js";
import { getUserFromRequest, isUserAdmin } from "./supabase.js";
import { getGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleReviews } from "./google.js";
import { saveTokens, getValidToken } from "./tokenService.js";
import {
  buildSquareAuthUrl,
  disconnectSquare,
  exchangeSquareCode,
  getSquareConfigSummary,
} from "./services/squareAuth.js";
import { importSquareCatalog } from "./services/catalogSync.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const blobPrefixMap = {
  branding: "branding",
  gallery: "gallery",
  before: "gallery/before",
  after: "gallery/after",
  testimonials: "testimonials",
} as const;

type BlobPrefix = keyof typeof blobPrefixMap;

const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX = 5;
const contactRateLimit = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_WRITE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_WRITE_RATE_LIMIT_MAX = 30;
const publicWriteRateLimit = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || "unknown";
};

const checkRateLimit = (
  req: Request,
  store: Map<string, { count: number; resetAt: number }>,
  windowMs: number,
  maxRequests: number,
) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
};

const checkContactRateLimit = (req: Request) =>
  checkRateLimit(req, contactRateLimit, CONTACT_RATE_LIMIT_WINDOW_MS, CONTACT_RATE_LIMIT_MAX);

const checkPublicWriteRateLimit = (req: Request) =>
  checkRateLimit(req, publicWriteRateLimit, PUBLIC_WRITE_RATE_LIMIT_WINDOW_MS, PUBLIC_WRITE_RATE_LIMIT_MAX);

const ensureSquareEnabled = (res: Response) => {
  if (process.env.SQUARE_ENABLED !== "true") {
    res.status(403).json({ message: "Square is not enabled" });
    return false;
  }
  return true;
};

const ensureSquareSyncEnabled = (res: Response) => {
  if (process.env.SQUARE_SYNC_ENABLED !== "true") {
    res.status(403).json({ message: "Square sync is not enabled" });
    return false;
  }
  return ensureSquareEnabled(res);
};

const getSquareWebhookSignatureKey = () => {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) {
    throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured");
  }
  return key;
};

const resolveSquareWebhookUrl = (req: Request) => {
  const configured = process.env.SQUARE_WEBHOOK_URL?.trim();
  if (configured) {
    return configured;
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol;
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host) {
    throw new Error("Unable to resolve Square webhook URL");
  }
  return `${protocol}://${host}${req.originalUrl}`;
};

const getSquareSignatureHeader = (req: Request) => {
  const signature = req.headers["x-square-hmacsha256-signature"];
  if (Array.isArray(signature)) {
    return signature[0];
  }
  return signature || null;
};

const isValidSquareWebhookSignature = (req: Request) => {
  const signature = getSquareSignatureHeader(req);
  if (!signature) {
    return false;
  }
  const rawBodyValue = (req as Request & { rawBody?: unknown }).rawBody;
  if (!rawBodyValue) {
    return false;
  }
  const rawBody = Buffer.isBuffer(rawBodyValue) ? rawBodyValue.toString("utf8") : String(rawBodyValue);
  const payload = `${resolveSquareWebhookUrl(req)}${rawBody}`;
  const expected = createHmac("sha256", getSquareWebhookSignatureKey()).update(payload).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, signatureBuffer);
};

const sanitizeFilenameBase = (filename: string) => {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  const asciiOnly = base.replace(/[^\x20-\x7E]+/g, "");
  const rawName = asciiOnly.split(".").slice(0, -1).join(".") || asciiOnly;
  const cleanedName = rawName
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleanedName || "upload").slice(0, 60);
};

const createSafeFilename = (filename: string, mimeType?: string | null) => {
  const baseName = sanitizeFilenameBase(filename);
  const extension = mimeType ? MIME_EXTENSION_MAP[mimeType.toLowerCase()] : "";
  const suffix = randomBytes(6).toString("hex");
  return extension ? `${baseName}-${suffix}.${extension}` : `${baseName}-${suffix}`;
};

const normalizeUploadFile = (file: Express.Multer.File) => {
  file.originalname = createSafeFilename(file.originalname, file.mimetype);
  return file;
};

const isAllowedImageType = (mimeType?: string | null) => {
  if (!mimeType) return false;
  return ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase());
};

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

type AuthedUser = { userId: string; email: string };
type AuthedRequest = Request & { user?: AuthedUser | null };

const createRequireAuthMiddleware = (supabaseEnabled: boolean): RequestHandler => {
  return async (req, res, next) => {
    if (!supabaseEnabled) {
      res.status(401).json({ message: "Unauthorized - Authentication not configured" });
      return;
    }

    const user = await getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ message: "Unauthorized - Please sign in" });
      return;
    }

    (req as AuthedRequest).user = user;
    next();
  };
};

const createRequireAdminMiddleware = (prisma: PrismaClient, supabaseEnabled: boolean): RequestHandler => {
  return async (req, res, next) => {
    if (!supabaseEnabled) {
      res.status(401).json({ message: "Unauthorized - Authentication not configured" });
      return;
    }

    const user = await getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ message: "Unauthorized - Please sign in" });
      return;
    }

    const isAdmin = await isUserAdmin(user.userId, prisma);

    if (!isAdmin) {
      res.status(403).json({ message: "Forbidden - Admin access required" });
      return;
    }

    (req as AuthedRequest).user = user;
    next();
  };
};

export async function registerRoutes(app: Express, env: EnvConfig): Promise<Server> {
  if (!env.supabaseEnabled) {
    console.warn("[WARN] Supabase is not configured. Authentication will not work until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  }

  if (!hasDatabaseUrl) {
    console.warn(
      "[WARN] DATABASE_URL is not configured. All API routes will respond with 503 until a database connection string is provided.",
    );

    app.use("/api", (_req, res) => {
      res.status(503).json({
        message: "Database connection is not configured. Set DATABASE_URL to enable API routes.",
      });
    });

    return createServer(app);
  }

  const prisma = assertPrisma();

  const requireAdmin = createRequireAdminMiddleware(prisma, env.supabaseEnabled);
  const requireAuthMiddleware = createRequireAuthMiddleware(env.supabaseEnabled);

  // Auth routes - Get current user (with auto-provisioning from Supabase Auth)
  app.get('/api/auth/user', requireAuthMiddleware, async (req: any, res) => {
    try {
      const authRequest = req as AuthedRequest;
      const authUser = authRequest.user;

      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Try to get existing user from database
      let user = await prisma.user.findUnique({ where: { id: authUser.userId } });

      // If user doesn't exist in DB, create them (first-time login)
      if (!user) {
        // Extract name parts from email if not provided
        const emailPrefix = authUser.email.split('@')[0];
        const nameParts = emailPrefix.split(/[._-]/);
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        // Create user record from Supabase auth data
        user = await prisma.user.create({
          data: {
            id: authUser.userId,
            email: authUser.email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: null,
            isAdmin: false,
          },
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching/creating user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // File upload endpoint for Vercel Blob - Protected with Supabase admin auth
  app.post("/api/upload", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      if (!env.blobEnabled) {
        res.status(400).json({
          error:
            "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads.",
        });
        return;
      }

      const normalizedFile = normalizeUploadFile(req.file);

      if (!isAllowedImageType(normalizedFile.mimetype)) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }

      const blob = await uploadBlobFile("gallery", normalizedFile);

      res.json({
        success: true,
        data: {
          url: blob.url,
          publicId: blob.pathname,
          path: blob.pathname,
          filename: normalizedFile.originalname,
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const rateLimit = checkContactRateLimit(req);
      if (rateLimit.limited) {
        res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
        return;
      }

      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await prisma.contactMessage.create({ data: validatedData });
      
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

  app.get("/api/blob/list", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ prefix: z.enum(Object.keys(blobPrefixMap) as [BlobPrefix, ...BlobPrefix[]]).default("gallery") })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob prefix" });
      return;
    }

    try {
      const prefix = blobPrefixMap[parsed.data.prefix];
      const images = await listBlobFiles(prefix);
      res.json({ images });
    } catch (error) {
      console.error("Failed to list blobs", error);
      res.status(500).json({ error: "Failed to load blob files" });
    }
  });

  app.post("/api/blob/upload", requireAdmin, upload.single("file"), async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ prefix: z.enum(Object.keys(blobPrefixMap) as [BlobPrefix, ...BlobPrefix[]]).default("gallery") })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob prefix" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const normalizedFile = normalizeUploadFile(req.file);

    if (!isAllowedImageType(normalizedFile.mimetype)) {
      res.status(400).json({ error: "Only image uploads are allowed" });
      return;
    }

    try {
      const prefix = blobPrefixMap[parsed.data.prefix];
      const image = await uploadBlobFile(prefix, normalizedFile);
      res.json({ url: image.url, pathname: image.pathname, size: image.size });
    } catch (error) {
      console.error("Blob upload failed", error);
      res.status(500).json({ error: "Failed to upload blob" });
    }
  });

  app.get("/api/blob", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({
        prefix: z.string().trim().optional(),
      })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob query parameters" });
      return;
    }

    try {
      const prefix = parsed.data.prefix ?? "static/";
      const files = await listBlobFiles(prefix);

      res.json({ data: files });
    } catch (error) {
      console.error("Failed to list blobs", error);
      res.status(500).json({ error: "Failed to load blob files" });
    }
  });

  app.delete("/api/blob", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ url: z.string().url().min(1) })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "A valid blob URL is required" });
      return;
    }

    const { url } = parsed.data;
    if (!url.includes(".public.blob.vercel-storage.com")) {
      res.status(400).json({ error: "Blob URL must point to Vercel Blob storage" });
      return;
    }

    try {
      const linkedAsset = await prisma.siteAsset.findFirst({ where: { url } });
      if (linkedAsset) {
        res.status(400).json({
          error: `This image is currently used as ${linkedAsset.key}. Please change the asset first.`,
        });
        return;
      }

      await removeBlob(url);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete blob", error);
      res.status(500).json({ error: "Failed to delete blob" });
    }
  });

  // Site assets endpoints (Vercel Blob backed)
  app.get("/api/assets", async (_req, res) => {
    try {
      const assets = await prisma.siteAsset.findMany({ orderBy: { key: "asc" } });
      const map = assets.reduce<Record<string, ReturnType<typeof buildAssetPayload>>>((acc, asset) => {
        acc[asset.key] = buildAssetPayload(asset);
        return acc;
      }, {});

      res.json({ data: map });
    } catch (error) {
      console.error("Failed to load site assets", error);
      res.status(500).json({ error: "Failed to load site assets" });
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

      if (req.file && !env.blobEnabled) {
        res.status(400).json({
          error:
            "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads.",
        });
        return;
      }

      const normalizedFile = req.file ? normalizeUploadFile(req.file) : null;

      if (normalizedFile && !isAllowedImageType(normalizedFile.mimetype)) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }

      const blob = normalizedFile ? await uploadBlobFile("branding", normalizedFile) : null;

      const url = blob?.url ?? payload.url;
      if (!url) {
        res.status(400).json({ error: "Unable to resolve upload URL" });
        return;
      }

      const publicId = blob?.pathname ?? payload.publicId ?? getBlobPath(url);
      const filename = payload.filename ?? payload.name ?? normalizedFile?.originalname ?? payload.key;

      const asset = await prisma.siteAsset.upsert({
        where: { key: payload.key },
        update: {
          url,
          name: payload.name ?? filename,
          filename,
          publicId: publicId ?? undefined,
          description: payload.description,
        },
        create: {
          key: payload.key,
          url,
          name: payload.name ?? filename,
          filename,
          publicId: publicId ?? undefined,
          description: payload.description,
        },
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
      res.status(500).json({ error: "Failed to save asset" });
    }
  });

  app.put("/api/assets/:key", requireAdmin, async (req, res) => {
    try {
      const key = req.params.key;
      const updates = updateSiteAssetSchema.parse(req.body);
      const existing = await prisma.siteAsset.findUnique({ where: { key } });

      if (!existing && !updates.url) {
        res.status(400).json({ error: "Provide a URL to create a new asset" });
        return;
      }

      const asset = await prisma.siteAsset.upsert({
        where: { key },
        update: {
          url: updates.url ?? existing?.url ?? "",
          name: updates.name ?? existing?.name ?? key,
          filename: updates.filename ?? existing?.filename ?? existing?.name ?? key,
          publicId: updates.publicId ?? existing?.publicId ?? getBlobPath(updates.url ?? existing?.url ?? "") ?? undefined,
          description: updates.description ?? existing?.description ?? null,
        },
        create: {
          key,
          url: updates.url ?? existing?.url ?? "",
          name: updates.name ?? existing?.name ?? key,
          filename: updates.filename ?? existing?.filename ?? existing?.name ?? key,
          publicId: updates.publicId ?? existing?.publicId ?? getBlobPath(updates.url ?? existing?.url ?? "") ?? undefined,
          description: updates.description ?? existing?.description ?? null,
        },
      });

      res.json({ success: true, data: buildAssetPayload(asset), message: "Asset updated" });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid asset payload", errors: error.issues });
        return;
      }
      console.error("Asset update error:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.get("/api/contact", requireAdmin, async (req, res) => {
    try {
      const messages = await prisma.contactMessage.findMany({ orderBy: { timestamp: "desc" } });
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
      
      const message = await prisma.contactMessage.findUnique({ where: { id } });
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
      const items = await prisma.galleryItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/gallery:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery items",
        error: error instanceof Error ? error.message : String(error)
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
      
      const item = await prisma.galleryItem.findUnique({ where: { id } });
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
      const maxOrder = await prisma.galleryItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.galleryItem.create({ data: { ...validatedData, order: nextOrder } });
      
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
      
      // Preprocess: strip empty strings to undefined. Guard against missing/invalid bodies
      const incomingBody = req.body;
      const entries =
        incomingBody && typeof incomingBody === "object"
          ? Object.entries(incomingBody)
          : [];

      const preprocessedBody: any = {};
      for (const [key, value] of entries) {
        if (typeof value === "string" && value.trim() === "") {
          continue;
        }
        preprocessedBody[key] = value;
      }

      const validatedData = updateGalleryItemSchema.parse(preprocessedBody);
      const existing = await prisma.galleryItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }

      const item = await prisma.galleryItem.update({ where: { id }, data: validatedData });
      
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
      
      const existing = await prisma.galleryItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }

      await prisma.galleryItem.delete({ where: { id } });

      const blobTargets = [
        getBlobPath(existing.imagePublicId || existing.imageUrl),
        getBlobPath(existing.beforeImagePublicId || existing.beforeImageUrl),
        getBlobPath(existing.afterImagePublicId || existing.afterImageUrl),
      ].filter((path): path is string => Boolean(path));

      if (blobTargets.length > 0) {
        if (!env.blobEnabled) {
          console.warn("BLOB_READ_WRITE_TOKEN missing - skipped blob deletion for gallery item", id);
        } else {
          await removeBlob(blobTargets);
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
      const items = await prisma.testimonial.findMany({
        where: { isApproved: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
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
        const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });
        const nextOrder = (maxOrder._max.order ?? -1) + 1;
        const item = await prisma.testimonial.create({
          data: {
            author: validatedData.author ?? validatedData.name ?? "",
            content: validatedData.content ?? (validatedData as any).review ?? "",
            rating: validatedData.rating ?? 5,
            source: (validatedData as any).source,
            sourceUrl: (validatedData as any).sourceUrl,
            name: (validatedData as any).name,
            review: (validatedData as any).content ?? (validatedData as any).review,
            order: nextOrder,
          },
        });

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
        const existing = await prisma.testimonial.findUnique({ where: { id } });

        if (!existing) {
          res.status(404).json({
            success: false,
            message: "Testimonial not found"
          });
          return;
        }

        const item = await prisma.testimonial.update({ where: { id }, data: updates });

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

      const existing = await prisma.testimonial.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Testimonial not found"
        });
        return;
      }

      await prisma.testimonial.delete({ where: { id } });

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

  // Google OAuth endpoints
  app.get('/api/auth/google', requireAdmin, (req, res) => {
    try {
      const authUrl = getGoogleAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('OAuth URL error:', error);
      res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const rateLimit = checkPublicWriteRateLimit(req);
      if (rateLimit.limited) {
        res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        res.status(429).send("<html><body><h1>Too many requests</h1><p>Please try again later.</p></body></html>");
        return;
      }

      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).send('<html><body><h1>Error: Missing authorization code</h1></body></html>');
        return;
      }

      const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);
      await saveTokens('google', accessToken, refreshToken, expiresAt);

      res.send(`
        <html>
          <body>
            <h1>Google Account Connected!</h1>
            <p>You can now close this window and return to the admin dashboard.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('<html><body><h1>OAuth Error</h1><p>Failed to connect Google account.</p></body></html>');
    }
  });

  // Import reviews from Google
  app.post('/api/reviews/import/google', requireAdmin, async (req, res) => {
    try {
      const accessToken = await getValidToken('google');
      const { reviews } = await fetchGoogleReviews(accessToken);

      const imported = await prisma.testimonial.createMany({
        data: reviews.map((r: any) => ({
          author: r.author,
          content: r.content,
          rating: r.rating,
          source: 'google',
          sourceUrl: r.sourceUrl,
          externalId: r.externalId,
          isApproved: false,
          importedAt: new Date(),
        })),
        skipDuplicates: true,
      });

      res.json({
        success: true,
        imported: imported.count,
        message: `Imported ${imported.count} reviews. Awaiting approval.`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to import reviews',
      });
    }
  });

  // Approval workflow endpoints
  app.patch('/api/testimonials/:id/approve', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await prisma.testimonial.update({
        where: { id },
        data: { isApproved: true },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to approve testimonial' });
    }
  });

  app.delete('/api/testimonials/:id/reject', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await prisma.testimonial.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to reject testimonial' });
    }
  });

  // Get pending reviews (admin only)
  app.get('/api/testimonials/pending', requireAdmin, async (req, res) => {
    try {
      const pending = await prisma.testimonial.findMany({
        where: { isApproved: false },
        orderBy: { importedAt: 'desc' },
      });
      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending testimonials' });
    }
  });

  // Check Google connection status
  app.get('/api/auth/google/status', requireAdmin, async (req, res) => {
    try {
      const token = await prisma.oAuthToken.findUnique({
        where: { service: 'google' },
      });
      res.json({ connected: Boolean(token) });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Square OAuth endpoints
  app.get("/api/square/config", requireAdmin, async (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      const summary = await getSquareConfigSummary();
      res.json({ enabled: true, ...summary });
    } catch (_error) {
      res.status(500).json({ enabled: true, connected: false, message: "Failed to load Square config" });
    }
  });

  app.post("/api/square/connect", requireAdmin, (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      const { url } = buildSquareAuthUrl();
      res.json({ url });
    } catch (_error) {
      res.status(500).json({ message: "Failed to start Square OAuth" });
    }
  });

  app.get("/api/square/callback", async (req, res) => {
    if (process.env.SQUARE_ENABLED !== "true") {
      res.status(403).send("<html><body><h1>Square is not enabled.</h1></body></html>");
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).send("<html><body><h1>Too many requests</h1><p>Please try again later.</p></body></html>");
      return;
    }

    const { code, state } = req.query;
    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      res.status(400).send("<html><body><h1>Error: Missing authorization code.</h1></body></html>");
      return;
    }

    try {
      await exchangeSquareCode(code, state);
      res.send(`
        <html>
          <body>
            <h1>Square Account Connected!</h1>
            <p>You can now close this window and return to the admin dashboard.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (_error) {
      res.status(400).send("<html><body><h1>OAuth Error</h1><p>Failed to connect Square account.</p></body></html>");
    }
  });

  app.post("/api/square/disconnect", requireAdmin, async (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      await disconnectSquare();
      res.json({ success: true });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to disconnect Square" });
    }
  });

  app.post("/api/square/catalog/import", requireAdmin, async (_req, res) => {
    if (!ensureSquareSyncEnabled(res)) {
      return;
    }
    try {
      const result = await importSquareCatalog();
      res.json({ success: true, ...result });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to import Square catalog" });
    }
  });

  app.post("/api/square/catalog/sync", requireAdmin, async (_req, res) => {
    if (!ensureSquareSyncEnabled(res)) {
      return;
    }
    try {
      const result = await importSquareCatalog();
      res.json({ success: true, ...result });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to sync Square catalog" });
    }
  });

  app.post("/api/webhooks/square", async (req, res) => {
    if (process.env.SQUARE_ENABLED !== "true") {
      res.status(503).json({ message: "Square is not enabled" });
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      if (!isValidSquareWebhookSignature(req)) {
        res.status(401).json({ message: "Invalid Square webhook signature" });
        return;
      }
    } catch (error) {
      console.error("Square webhook signature validation failed", error);
      res.status(500).json({ message: "Failed to validate webhook signature" });
      return;
    }

    const eventType = (req.body?.type ?? req.body?.event_type ?? "unknown") as string;
    const eventId = (req.body?.event_id ?? req.body?.id ?? null) as string | null;

    console.log(`[SquareWebhook] type=${eventType} id=${eventId ?? "unknown"}`);

    res.status(200).json({ received: true });
  });

  // FAQs endpoints
  app.get("/api/faqs", async (_req, res) => {
    try {
      const items = await prisma.faqItem.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve FAQs" });
    }
  });

  app.post("/api/faqs", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqSchema.parse(req.body);
      const maxOrder = await prisma.faqItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.faqItem.create({ data: { ...validatedData, order: validatedData.order ?? nextOrder } });

      res.status(201).json({ success: true, message: "FAQ created successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid FAQ data", errors: error.issues });
        return;
      }
      console.error("Failed to create FAQ", error);
      res.status(500).json({ success: false, message: "Failed to create FAQ" });
    }
  });

  app.patch("/api/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const updates = updateFaqSchema.parse(req.body);
      const existing = await prisma.faqItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "FAQ not found" });
        return;
      }

      const item = await prisma.faqItem.update({ where: { id }, data: updates });

      res.json({ success: true, message: "FAQ updated successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid FAQ data", errors: error.issues });
        return;
      }
      if (error instanceof Error && error.message.includes("Order")) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      console.error("Failed to update FAQ", error);
      res.status(500).json({ success: false, message: "Failed to update FAQ" });
    }
  });

  app.delete("/api/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const existing = await prisma.faqItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "FAQ not found" });
        return;
      }

      await prisma.faqItem.delete({ where: { id } });

      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete FAQ" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const items = await prisma.serviceItem.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/services:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve services",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

    app.post("/api/services", requireAdmin, async (req, res) => {
      try {
        const validatedData = insertServiceSchema.parse(req.body);
        const maxOrder = await prisma.serviceItem.aggregate({ _max: { order: true } });
        const nextOrder = (maxOrder._max.order ?? -1) + 1;
        const item = await prisma.serviceItem.create({
          data: {
            ...validatedData,
            title: (validatedData as any).title ?? (validatedData as any).name ?? "",
            name: (validatedData as any).name ?? (validatedData as any).title ?? "",
            order: nextOrder,
          },
        });

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
        const existing = await prisma.serviceItem.findUnique({ where: { id } });

        if (!existing) {
          res.status(404).json({
            success: false,
            message: "Service not found"
          });
          return;
        }

        const item = await prisma.serviceItem.update({ where: { id }, data: updates });

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
      
      const existing = await prisma.serviceItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Service not found"
        });
        return;
      }

      await prisma.serviceItem.delete({ where: { id } });
      
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

  // Blog posts endpoints
  app.get("/api/posts", async (_req, res) => {
    try {
      const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve posts",
      });
    }
  });

  app.get("/api/posts/admin", requireAdmin, async (_req, res) => {
    try {
      const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve posts",
      });
    }
  });

  app.post("/api/posts", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await prisma.post.create({ data: validatedData });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid post data", errors: error.issues });
        return;
      }
      console.error("Failed to create post", error);
      res.status(500).json({
        success: false,
        message: "Failed to create post",
      });
    }
  });

  app.patch("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const updates = updatePostSchema.parse(req.body);
      const existing = await prisma.post.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      const post = await prisma.post.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });

      res.json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid post data", errors: error.issues });
        return;
      }
      console.error("Failed to update post", error);
      res.status(500).json({ success: false, message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const existing = await prisma.post.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      await prisma.post.delete({ where: { id } });

      res.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete post" });
    }
  });

  app.get("/api/posts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await prisma.post.findFirst({ where: { slug, published: true } });

      if (!post) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve post" });
    }
  });

  // Fragrance Products endpoints
  app.get("/api/products", async (_req, res) => {
    try {
      const items = await prisma.fragranceProduct.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/products:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve products",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFragranceProductSchema.parse(req.body);
      const maxOrder = await prisma.fragranceProduct.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.fragranceProduct.create({
        data: {
          ...validatedData,
          order: validatedData.order ?? nextOrder,
        },
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid product data",
          errors: error.issues
        });
      } else {
        console.error("Failed to create product", error);
        res.status(500).json({
          success: false,
          message: "Failed to create product"
        });
      }
    }
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }

      const updates = updateFragranceProductSchema.parse(req.body);
      const existing = await prisma.fragranceProduct.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      const item = await prisma.fragranceProduct.update({ where: { id }, data: updates });

      res.json({
        success: true,
        message: "Product updated successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid product data", errors: error.issues });
        return;
      }
      console.error("Failed to update product", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product"
      });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }

      const existing = await prisma.fragranceProduct.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      await prisma.fragranceProduct.delete({ where: { id } });

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete product"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
