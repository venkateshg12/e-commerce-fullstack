import { updateCategory } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Category } from "@/types/product.types";
import type { CategorySchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdateCategoryParams = {
    categoryId: string;
    data: CategorySchema;
};

export const useUpdateCategory = () => {
    return useMutation<SuccessResponse<Category>, FailureResponse, UpdateCategoryParams>({
        mutationFn: ({ categoryId, data }: UpdateCategoryParams) => updateCategory(categoryId, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
            // Products embed the category name.
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                useProductStore.getState().updateCategoryInStore(response.data);
            }
        },
    });
};
