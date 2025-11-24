import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();
  
  // Fetch user data from our database (only if signed in with Clerk)
  const { data: dbUser, isLoading: dbLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!isSignedIn && !!clerkUser,
    retry: false,
  });

  const isLoading = !clerkLoaded || (isSignedIn && dbLoading);

  return {
    user: dbUser ?? null,
    isLoading,
    isAuthenticated: isSignedIn ?? false,
    isAdmin: dbUser?.isAdmin ?? false,
  };
}
