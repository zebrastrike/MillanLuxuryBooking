const rawPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const rawFrontendApi = import.meta.env.VITE_CLERK_FRONTEND_API?.trim() ?? "";

export const CLERK_PUBLISHABLE_KEY = rawPublishableKey;
export const CLERK_FRONTEND_API = rawFrontendApi || undefined;

// Treat missing or malformed keys (non pk_) as disabled so the UI never crashes
const hasValidPublishableKey = /^pk_/.test(rawPublishableKey);
export const CLERK_ENABLED = hasValidPublishableKey;

if (!CLERK_ENABLED) {
  // eslint-disable-next-line no-console
  console.warn("[Clerk] CLERK_PUBLISHABLE_KEY is missing or invalid. Authentication UI is disabled.");
} else if (!rawFrontendApi) {
  // eslint-disable-next-line no-console
  console.warn("[Clerk] VITE_CLERK_FRONTEND_API is missing. If you're using a custom Clerk domain, set it to avoid hydration issues.");
}

export const CLERK_ADMIN_EMAIL = (import.meta.env.VITE_CLERK_ADMIN_EMAIL ?? "").trim().toLowerCase();
