import { updateProductMetadata } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import type { UpdateProductMetadataSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdateProductParams = {
    productId: string;
    payload: UpdateProductMetadataSchema;
};

export const useUpdateProduct = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, UpdateProductParams>({
        mutationFn: ({ productId, payload }: UpdateProductParams) => updateProductMetadata(productId, payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                useProductStore.getState().updateProductInStore(response.data);
            }
        },
    });
};
