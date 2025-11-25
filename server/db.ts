import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

/**
 * Database bootstrap
 *
 * In production we require a DATABASE_URL (Neon/Postgres). During local
 * development the variable may be absent, so we expose a nullable database and
 * allow the storage layer to fall back to an in-memory implementation instead
 * of crashing the server on startup.
 */
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

export const pool = hasDatabaseUrl
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;
