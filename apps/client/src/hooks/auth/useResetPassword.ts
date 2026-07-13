import { resetPassword } from "@/api/auth"
import type { FailureResponse, SuccessResponse, VerifiedResponse } from "@/lib/types";
import type { ResetPasswordSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query"

export const useResetPassword = () => {
    return useMutation<
    SuccessResponse<VerifiedResponse>,
    FailureResponse,
    ResetPasswordSchema & { token: string }
    >({
        mutationFn: resetPassword
    });
}
