import { forgotPassword } from "@/api/auth"
import type { FailureResponse, SuccessResponse, VerifiedResponse } from "@/lib/types";
import { useMutation } from "@tanstack/react-query"

export const useForgotPassword = () => {
    return useMutation<
    SuccessResponse<VerifiedResponse>,
    FailureResponse,
    string
    >({
        mutationFn: forgotPassword
    });
}
