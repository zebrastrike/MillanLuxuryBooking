import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().trim().optional(),
  CLERK_SECRET_KEY: z.string().trim().optional(),
  /**
   * Vercel dashboard currently exposes the blob token as `Blob_Evans_READ_WRITE_TOKEN`.
   * Keep supporting the previous `BLOB_READ_WRITE_TOKEN` name to avoid breaking local dev.
   */
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),
  Blob_Evans_READ_WRITE_TOKEN: z.string().trim().optional(),
  DATABASE_URL: z.string().trim().optional(),
});

export type EnvConfig = ReturnType<typeof loadEnv>;

export function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Environment validation failed: ${parsed.error.message}`);
  }

  const env = parsed.data;

  const requireInProduction = (value: string | undefined, name: string) => {
    if (env.NODE_ENV === "production" && !value) {
      throw new Error(`${name} is required in production.`);
    }
  };

  const rawBlobToken = env.BLOB_READ_WRITE_TOKEN ?? env.Blob_Evans_READ_WRITE_TOKEN;

  if (!env.DATABASE_URL) {
    console.warn("[WARN] DATABASE_URL is not set. Database-backed API routes will be disabled until it is configured.");
  }

  requireInProduction(env.CLERK_SECRET_KEY, "CLERK_SECRET_KEY");
  requireInProduction(env.CLERK_PUBLISHABLE_KEY, "CLERK_PUBLISHABLE_KEY");
  requireInProduction(rawBlobToken, "BLOB_READ_WRITE_TOKEN (or Blob_Evans_READ_WRITE_TOKEN)");

  const clerkEnabled = Boolean(env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY);
  const blobToken = rawBlobToken ?? "";
  const blobEnabled = Boolean(rawBlobToken);

  const port = Number.parseInt(env.PORT || "5000", 10);

  return {
    nodeEnv: env.NODE_ENV,
    port,
    clerkEnabled,
    blobEnabled,
    clerk: {
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    },
    blob: {
      token: blobToken,
    },
    databaseUrl: env.DATABASE_URL,
  } as const;
}
