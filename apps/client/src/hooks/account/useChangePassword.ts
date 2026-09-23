import { changePassword } from "@/api/auth";
import type { ChangePasswordPayload, ChangePasswordResponse, FailureResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useChangePassword = () => {
    return useMutation<SuccessResponse<ChangePasswordResponse>, FailureResponse, ChangePasswordPayload>({
        mutationFn: changePassword,
    });
};
