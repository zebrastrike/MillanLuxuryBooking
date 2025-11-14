import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    retry: false,
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: data?.authenticated || false,
    isAdmin: data?.user?.isAdmin || false,
  };
}
