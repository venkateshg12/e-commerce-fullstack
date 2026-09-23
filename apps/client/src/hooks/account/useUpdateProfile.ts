import { updateProfile } from "@/api/auth";
import queryClient from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, SuccessResponse, UpdateProfilePayload, UpdateProfileResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useUpdateProfile = () => {
    return useMutation<SuccessResponse<UpdateProfileResponse>, FailureResponse, UpdateProfilePayload>({
        mutationFn: updateProfile,
        onSuccess: (response) => {
            const { user } = response.data;
            queryClient.setQueryData(["profile"], { status: "success", data: { user } });
            useAuthStore.getState().setUser({
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
            });
        },
    });
};
