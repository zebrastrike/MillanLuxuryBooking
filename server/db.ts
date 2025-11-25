import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

/**
 * Database bootstrap
 *
 * In production we **must** have a DATABASE_URL. In-memory storage is only
 * permitted for local development when explicitly enabled.
 */
const nodeEnv = process.env.NODE_ENV ?? "production";
const allowInMemoryStorage = nodeEnv !== "production" && process.env.ALLOW_IN_MEMORY_STORAGE === "true";

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
export const useInMemoryStorage = !hasDatabaseUrl && allowInMemoryStorage;

if (!hasDatabaseUrl && !useInMemoryStorage) {
  throw new Error("DATABASE_URL is required. Set DATABASE_URL or enable ALLOW_IN_MEMORY_STORAGE=true in development.");
}

export const pool = hasDatabaseUrl
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;
