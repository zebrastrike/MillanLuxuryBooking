import { clerkClient, getAuth } from "@clerk/express";
import { isAdminUser } from "../shared/auth";
import { assertPrisma } from "../server/db/prismaClient";

const prisma = assertPrisma();
const authConfigured = Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);

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

export function handleUnknownError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ success: false, message });
}

export async function ensureAdmin(req: any, res: any): Promise<boolean> {
  if (!authConfigured) {
    res.status(503).json({ message: "Authentication is not configured." });
    return false;
  }

  try {
    const auth = getAuth(req as any);

    if (!auth?.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return false;
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const userRecord = await prisma.user.findUnique({ where: { id: auth.userId } });
    const isAdmin = isAdminUser(clerkUser) || Boolean(userRecord?.isAdmin);

    if (!isAdmin) {
      res.status(403).json({ message: "Forbidden - admin access required" });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
    return false;
  }
}
