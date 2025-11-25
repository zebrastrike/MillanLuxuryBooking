import { useEffect } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { CLERK_ADMIN_EMAIL, CLERK_ENABLED } from "@/lib/clerkConfig";

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const isAllowedAdminEmail = (email: string) => {
  if (!CLERK_ADMIN_EMAIL) return true; // fall back to server-side flags when not configured
  return normalizeEmail(email) === CLERK_ADMIN_EMAIL;
};

let hasWarnedDevAuth = false;

function useDevAuth() {
  useEffect(() => {
    if (!hasWarnedDevAuth) {
      // eslint-disable-next-line no-console
      console.warn(
        "[Auth] Clerk keys are missing or invalid. Running in unsecured dev mode with local admin access. Configure VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for production."
      );
      hasWarnedDevAuth = true;
    }
  }, []);

  const { data: dbUser, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: 2,
  });

  return {
    user: dbUser ?? null,
    email: dbUser?.email ?? null,
    clerkLoaded: true,
    isLoading,
    isAuthenticated: Boolean(dbUser),
    isAdmin: Boolean(dbUser?.isAdmin && isAllowedAdminEmail(dbUser?.email ?? "")),
    error: error as Error | null,
    adminEmailMismatch: Boolean(CLERK_ADMIN_EMAIL && !isAllowedAdminEmail(dbUser?.email ?? "")),
  };
}

function useClerkBackedAuth() {
  const { isSignedIn, isLoaded: authLoaded } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const clerkLoaded = authLoaded && userLoaded;

  const primaryEmail = normalizeEmail(
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.find((addr) => addr?.emailAddress)?.emailAddress ??
    undefined
  );

  // Fetch user data from our database (only if signed in with Clerk)
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: Boolean(isSignedIn && clerkLoaded),
    retry: 2, // Retry failed requests twice
  });

  const isLoading = !clerkLoaded || (isSignedIn && dbLoading);
  const allowedByEmail = isAllowedAdminEmail(primaryEmail || dbUser?.email || "");
  const resolvedUser = dbUser ?? null;

  return {
    user: resolvedUser,
    email: primaryEmail || resolvedUser?.email || null,
    clerkLoaded,
    isLoading,
    isAuthenticated: Boolean(isSignedIn && resolvedUser),
    isAdmin: Boolean(resolvedUser?.isAdmin && allowedByEmail),
    error: error as Error | null,
    adminEmailMismatch: Boolean(clerkLoaded && CLERK_ADMIN_EMAIL && !allowedByEmail),
  };
}

export function useAuth() {
  return CLERK_ENABLED ? useClerkBackedAuth() : useDevAuth();
}
