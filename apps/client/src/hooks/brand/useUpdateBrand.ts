import { updateBrand } from "@/api/catalog";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Brand } from "@/types/product.types";
import type { BrandSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdateBrandParams = {
    brandId: string;
    data: BrandSchema;
};

export const useUpdateBrand = () => {
    return useMutation<SuccessResponse<Brand>, FailureResponse, UpdateBrandParams>({
        mutationFn: ({ brandId, data }: UpdateBrandParams) => updateBrand(brandId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] });
            // Products embed the brand name.
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        },
    });
};
