import type { PrismaClient } from "@prisma/client";
import { getAuth } from "@clerk/express";

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

export function handleUnknownError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ success: false, message });
}

export async function requireAdmin(req: any, res: any, prisma: PrismaClient) {
  if (!clerkEnabled) {
    res.status(503).json({ message: "Authentication is not configured." });
    return null;
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.isAdmin) {
    res.status(403).json({ message: "Forbidden - admin access required" });
    return null;
  }

  return user;
}
