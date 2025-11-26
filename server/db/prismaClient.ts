import { PrismaClient } from "@prisma/client";

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

export const prisma = hasDatabaseUrl ? new PrismaClient() : null;

export function assertPrisma() {
  if (!prisma) {
    throw new Error("Database connection is not configured. Set DATABASE_URL to enable Postgres storage.");
  }
  return prisma;
}
