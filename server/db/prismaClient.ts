import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const loadDotEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    let key = trimmed.slice(0, eqIndex).trim();
    if (key.startsWith("export ")) {
      key = key.slice("export ".length).trim();
    }
    if (!key) {
      continue;
    }

    let value = trimmed.slice(eqIndex + 1).trim();
    const isQuoted =
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadDotEnv();

const normalizeDatabaseUrl = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString();
  } catch {
    return value;
  }
};

const resolveDatabaseUrl = () => {
  const pooled = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const direct = normalizeDatabaseUrl(process.env.DIRECT_URL);

  if (process.env.NODE_ENV !== "production" && direct) {
    if (pooled && pooled !== direct) {
      console.warn("[WARN] Using DIRECT_URL for local runtime to avoid pooler connection issues.");
    }
    return direct;
  }

  return pooled ?? direct;
};

const resolvedDatabaseUrl = resolveDatabaseUrl();
if (resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

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
