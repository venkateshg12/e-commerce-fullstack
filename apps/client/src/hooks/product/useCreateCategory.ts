import { createCategory } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Category } from "@/types/product.types";
import type { CategorySchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

export const useCreateCategory = () => {
    return useMutation<SuccessResponse<Category>, FailureResponse, CategorySchema>({
        mutationFn: createCategory,
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
            if (response?.data) {
                useProductStore.getState().addCategory(response.data);
            }
        },
    });
};
