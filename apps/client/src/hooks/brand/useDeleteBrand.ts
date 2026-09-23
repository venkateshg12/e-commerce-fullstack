import { deleteBrand } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useDeleteBrand = () => {
    return useMutation<SuccessResponse<{ _id: string }>, FailureResponse, string>({
        mutationFn: deleteBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] });
        },
    });
};
