import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/types";
import { isAdminUser } from "@shared/auth";
import { CLERK_ENABLED } from "@/lib/clerkConfig";

const IS_PRODUCTION = import.meta.env.MODE === "production";

function useDisabledClerkAuth() {
  if (IS_PRODUCTION) {
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

  return {
    user: {
      id: "local-dev-admin",
      email: "local-admin@example.com",
      firstName: "Local",
      lastName: "Admin",
      profileImageUrl: null,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    email: "local-admin@example.com",
    isLoaded: true,
    isLoading: false,
    isAuthenticated: true,
    isSignedIn: true,
    isAdmin: true,
    error: null,
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
