import { createBrand } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Brand } from "@/types/product.types";
import type { BrandSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

export const useCreateBrand = () => {
    return useMutation<SuccessResponse<Brand>, FailureResponse, BrandSchema>({
        mutationFn: createBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] });
        },
    });
};
