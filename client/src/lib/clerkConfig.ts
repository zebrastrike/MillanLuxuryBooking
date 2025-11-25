const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

// Treat missing or malformed keys (non pk_) as disabled so the UI never crashes
export const CLERK_PUBLISHABLE_KEY = rawKey ?? "";
export const CLERK_ENABLED = typeof rawKey === "string" && /^pk_/.test(rawKey);

if (!CLERK_ENABLED) {
  // eslint-disable-next-line no-console
  console.warn("[Clerk] CLERK_PUBLISHABLE_KEY is missing or invalid. Authentication UI is disabled.");
}
