import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const createPrismaClient = () => new PrismaClient();

export const prisma = hasDatabaseUrl
  ? process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : globalForPrisma.prisma ?? createPrismaClient()
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function assertPrisma() {
  if (!prisma || !hasDatabaseUrl) {
    throw new Error("Database connection is not configured. Set DATABASE_URL to enable Postgres storage.");
  }
  return prisma;
}
