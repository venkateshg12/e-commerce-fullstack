import { logout } from "@/api/auth";
import queryClient, { clearUserQueries } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useLogout = () => {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((state) => state.clearAuth);

    return useMutation({
        mutationFn: logout,
        onSuccess: () => {
            queryClient.setQueryData(["profile"], null);
            clearAuth();
            // The shopper's cart, wishlist and orders leave with them, so the header counts and
            // any page they land on next start empty instead of showing the previous session's.
            // After clearAuth, so those queries are already gated off and cannot refetch.
            clearUserQueries();
            navigate("/", { replace: true });
        },
    });
};