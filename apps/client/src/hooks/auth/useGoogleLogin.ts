import { googleLogin } from "@/api/auth";
import type { FailureResponse, LoginResponse, SuccessResponse } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useGoogleLogin = () => {
    const navigate = useNavigate();
    return useMutation<
    SuccessResponse<LoginResponse>,
    FailureResponse,
    string
    >({
        mutationFn: googleLogin,
        onSuccess: () => {
            navigate("/home", {
                replace: true
            });
        }
    });
}
