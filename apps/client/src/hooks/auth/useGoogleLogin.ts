import { googleLogin } from "@/api/auth";
import queryClient from "@/lib/queryClient";
import { mergeGuestBagIntoAccount } from "@/lib/mergeGuestBag";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, LoginResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useGoogleLogin = () => {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation<
    SuccessResponse<LoginResponse>,
    FailureResponse,
    string
    >({
        mutationFn: googleLogin,
        onSuccess: (response) => {
            // Whatever they put in their cart or wishlist while logged out follows them in.
            void mergeGuestBagIntoAccount();

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
            const targetPath = response.data.user.role === "admin" ? "/admin" : "/";
            navigate(targetPath, {
                replace: true,
            });
        },
    });
};
