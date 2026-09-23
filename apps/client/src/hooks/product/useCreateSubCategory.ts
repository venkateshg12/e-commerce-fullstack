import { createSubCategory } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { SubCategory } from "@/types/product.types";
import type { SubCategorySchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

export const useCreateSubCategory = () => {
    return useMutation<SuccessResponse<SubCategory>, FailureResponse, SubCategorySchema>({
        mutationFn: createSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
        },
    });
};
