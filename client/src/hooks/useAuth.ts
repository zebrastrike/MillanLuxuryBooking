import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Don't throw on errors - we'll handle them gracefully
    throwOnError: false,
  });

  // Check if error is a 401 Unauthorized response
  const is401Error = error && 
    ((error instanceof Response && error.status === 401) ||
     (error as any).message?.includes('401'));

  // If 401, user is not authenticated (not an error, just not logged in)
  if (is401Error) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
    };
  }

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
  };
}
