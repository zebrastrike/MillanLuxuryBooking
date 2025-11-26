/**
 * @clerk/vercel-edge is not supported in the Node/Express environment.
 * Use the Clerk Node SDK for serverless functions.
 */
import type { PrismaClient } from "@prisma/client";
import { clerkClient, getAuth } from "@clerk/clerk-sdk-node";
import { isAdminUser } from "../shared/auth";
import { hasDatabaseUrl } from "../server/db/prismaClient";

const clerkEnabled = Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);

export function ensureParsedBody(req: any) {
  if (req.body === undefined || req.body === null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function parseIdParam(value: any): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function methodNotAllowed(res: any, methods: string[]) {
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ message: "Method Not Allowed" });
}

export function requireAuth(req: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) throw new Error("Unauthorized");

  return userId;
}

export function handleUnknownError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ success: false, message });
}

export function ensureDatabase(res: any) {
  if (hasDatabaseUrl) return true;

  res.status(503).json({
    message: "Database connection is not configured. Set DATABASE_URL to enable API routes.",
  });
  return false;
}

export async function requireAdmin(req: any, res: any, prisma: PrismaClient) {
  if (!clerkEnabled) {
    res.status(503).json({ message: "Authentication is not configured." });
    return null;
  }

  try {
    const auth = getAuth(req);
    const userId = auth?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }

    const [dbUser, clerkUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      clerkClient.users.getUser(userId),
    ]);

    const adminFromClerk = isAdminUser(clerkUser);
    const userIsAdmin = Boolean(dbUser?.isAdmin) || adminFromClerk;

    if (!userIsAdmin) {
      res.status(403).json({ message: "Forbidden - admin access required" });
      return null;
    }

    if (dbUser) return dbUser;

    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses.find((address) => address.emailAddress)?.emailAddress ||
      null;

    return prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        profileImageUrl: clerkUser.imageUrl || null,
        isAdmin: userIsAdmin,
      },
      create: {
        id: userId,
        email,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        profileImageUrl: clerkUser.imageUrl || null,
        isAdmin: userIsAdmin,
      },
    });
  } catch (error) {
    console.error("Admin verification failed", error);
    res.status(500).json({ message: "Failed to verify admin status" });
    return null;
  }
}
