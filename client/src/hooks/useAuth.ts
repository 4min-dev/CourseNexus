import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });

      // If 401, return null (not authenticated) instead of throwing
      if (res.status === 401 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
    retry: false,
    staleTime: 60000, // Кэшировать данные пользователя на 1 минуту
    refetchOnWindowFocus: true, // Обновлять при возврате на вкладку
  });

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user && !isError,
  };
}
