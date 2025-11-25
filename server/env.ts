import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().trim().optional(),
  CLERK_SECRET_KEY: z.string().trim().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),
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

  requireInProduction(env.DATABASE_URL, "DATABASE_URL");
  requireInProduction(env.CLERK_PUBLISHABLE_KEY, "CLERK_PUBLISHABLE_KEY");
  requireInProduction(env.CLERK_SECRET_KEY, "CLERK_SECRET_KEY");
  requireInProduction(env.BLOB_READ_WRITE_TOKEN, "BLOB_READ_WRITE_TOKEN");

  const clerkEnabled = Boolean(env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
  const blobEnabled = Boolean(env.BLOB_READ_WRITE_TOKEN);

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
      token: env.BLOB_READ_WRITE_TOKEN,
    },
    databaseUrl: env.DATABASE_URL,
  } as const;
}
