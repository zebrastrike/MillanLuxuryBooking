import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const hasDatabaseUrl = Boolean(databaseUrl);

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
