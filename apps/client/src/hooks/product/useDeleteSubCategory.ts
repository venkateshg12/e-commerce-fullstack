import { deleteSubCategory } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useDeleteSubCategory = () => {
    return useMutation<SuccessResponse<{ _id: string }>, FailureResponse, string>({
        mutationFn: deleteSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
        },
    });
};
