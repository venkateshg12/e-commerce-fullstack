import { login } from "@/api/auth"
import type { FailureResponse, LoginResponse, SuccessResponse } from "@/lib/types";
import type { LoginInSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

export const useLogin = () => {
    const navigate = useNavigate();
    return useMutation<
    SuccessResponse<LoginResponse>,
    FailureResponse,
    LoginInSchema
    >({
        mutationFn : login,
        onSuccess:() => {
            navigate("/home", {
                replace : true
            })
        }
    })
}