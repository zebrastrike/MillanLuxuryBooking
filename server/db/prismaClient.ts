import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

export const prisma = hasDatabaseUrl
  ? globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    })
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function assertPrisma() {
  if (!prisma) {
    throw new Error("Database connection is not configured. Set DATABASE_URL to enable Postgres storage.");
  }
  return prisma;
}
