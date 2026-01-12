import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  /**
   * Vercel dashboard currently exposes the blob token as `Blob_Evans_READ_WRITE_TOKEN`.
   * Keep supporting the previous `BLOB_READ_WRITE_TOKEN` name to avoid breaking local dev.
   */
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),
  Blob_Evans_READ_WRITE_TOKEN: z.string().trim().optional(),
  DATABASE_URL: z.string().trim().optional(),
  DIRECT_URL: z.string().trim().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Encryption key for OAuth tokens (REQUIRED for OAuth)
  OAUTH_ENCRYPTION_KEY: z.string().min(32).optional(),
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

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("[WARN] DATABASE_URL is not set. Database-backed API routes will be disabled until it is configured.");
  }

  const supabaseConfigured = Boolean(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY));

  if (!supabaseConfigured) {
    console.warn("[WARN] Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) to enable authentication.");
  }

  if (env.NODE_ENV === "production" && !rawBlobToken) {
    console.warn("[WARN] Blob storage token is missing. Upload endpoints will be unavailable.");
  }
  const blobToken = rawBlobToken ?? "";
  const blobEnabled = Boolean(rawBlobToken);

  const port = Number.parseInt(env.PORT || "5000", 10);

  const googleOAuthEnabled = Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.OAUTH_ENCRYPTION_KEY
  );

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.OAUTH_ENCRYPTION_KEY) {
    console.warn("[WARN] Google OAuth credentials provided but OAUTH_ENCRYPTION_KEY is missing. OAuth will be disabled.");
  }

  return {
    nodeEnv: env.NODE_ENV,
    port,
    supabaseEnabled: supabaseConfigured,
    blobEnabled,
    googleOAuthEnabled,
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    blob: {
      token: blobToken,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    oauthEncryptionKey: env.OAUTH_ENCRYPTION_KEY,
    databaseUrl,
  } as const;
}
