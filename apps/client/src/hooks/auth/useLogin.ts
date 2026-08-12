import { login } from "@/api/auth";
import queryClient from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, LoginResponse, SuccessResponse } from "@/types";
import type { LoginInSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation<
    SuccessResponse<LoginResponse>,
    FailureResponse,
    LoginInSchema
    >({
        mutationFn: login,
        onSuccess: (response) => {
            setUser({
                id: response.data.user._id,
                name: response.data.user.name,
                email: response.data.user.email,
                avatar: response.data.user.avatar,
                role: response.data.user.role,
            });
            queryClient.setQueryData(["profile"], {
                status: "success",
                data: {
                    user: response.data.user,
                },
            });
            const targetPath = response.data.user.role === "admin" ? "/admin" : "/home";
            navigate(targetPath, {
                replace: true,
            });
        },
    });
};