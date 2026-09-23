import { updateSubCategory } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { SubCategory } from "@/types/product.types";
import type { UpdateSubCategorySchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdateSubCategoryParams = {
    subCategoryId: string;
    data: UpdateSubCategorySchema;
};

export const useUpdateSubCategory = () => {
    return useMutation<SuccessResponse<SubCategory>, FailureResponse, UpdateSubCategoryParams>({
        mutationFn: ({ subCategoryId, data }: UpdateSubCategoryParams) => updateSubCategory(subCategoryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["customer-categories"] });
            // Products embed the type name.
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        },
    });
};
