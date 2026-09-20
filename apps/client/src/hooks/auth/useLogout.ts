import { logout } from "@/api/auth";
import queryClient from "@/lib/queryClient";
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
            navigate("/", { replace: true });
        },
    });
};