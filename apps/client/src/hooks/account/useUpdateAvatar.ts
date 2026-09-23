import { updateAvatar } from "@/api/auth";
import queryClient from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, SuccessResponse, UpdateAvatarResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useUpdateAvatar = () => {
    return useMutation<SuccessResponse<UpdateAvatarResponse>, FailureResponse, File>({
        mutationFn: (file: File) => updateAvatar(file),
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
