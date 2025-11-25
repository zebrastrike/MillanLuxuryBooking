import { useEffect } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { CLERK_ENABLED } from "@/lib/clerkConfig";

function useDevAuth() {
  const { data: dbUser, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: 2,
  });

  return {
    user: dbUser ?? null,
    isLoading,
    isAuthenticated: Boolean(dbUser),
    isAdmin: dbUser?.isAdmin ?? false,
    error: error as Error | null,
  };
}

function useClerkBackedAuth() {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();

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
