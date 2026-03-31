import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useLocation } from "wouter";

export function useLogout() {
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    const logout = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error("Logout request failed");
            }

            await queryClient.resetQueries();

            setLocation("/login");

        } catch (error) {
            console.error("Logout error:", error);
            queryClient.resetQueries();
            setLocation("/login");
        }
    }, [queryClient, setLocation]);

    return logout;
}