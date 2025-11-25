import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { isAdminUser } from "@shared/auth";
import { CLERK_ENABLED } from "@/lib/clerkConfig";

function useDisabledClerkAuth() {
  return {
    user: null,
    email: null,
    isLoaded: true,
    isLoading: false,
    isAuthenticated: false,
    isSignedIn: false,
    isAdmin: false,
    error: new Error("Clerk is not configured. Admin access is unavailable."),
  };
}

function useClerkBackedAuth() {
  const { isSignedIn, isLoaded: authLoaded } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const clerkLoaded = authLoaded && userLoaded;
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? null;

  // Fetch user data from our database (only if signed in with Clerk)
  const { data: dbUser, isLoading: dbLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: Boolean(isSignedIn && clerkLoaded),
    retry: 2, // Retry failed requests twice
  });

  const resolvedUser = dbUser ?? null;
  const isAdmin = isAdminUser(clerkUser) || Boolean(dbUser?.isAdmin);
  const isAuthenticated = Boolean(clerkLoaded && isSignedIn);
  const isLoaded = clerkLoaded && (!isSignedIn || !dbLoading);
  const isLoading = !isLoaded;

  return {
    user: resolvedUser,
    email: primaryEmail || resolvedUser?.email || null,
    isLoaded,
    isLoading,
    isAuthenticated,
    isSignedIn,
    isAdmin,
    error: error as Error | null,
  };
}

export function useAuth() {
  return CLERK_ENABLED ? useClerkBackedAuth() : useDisabledClerkAuth();
}
