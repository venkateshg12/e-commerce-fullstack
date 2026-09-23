import { deleteProductImages } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import type { DeleteProductImagesSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type DeleteProductImagesParams = {
    productId: string;
    payload: DeleteProductImagesSchema;
};

export const useDeleteProductImages = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, DeleteProductImagesParams>({
        mutationFn: ({ productId, payload }: DeleteProductImagesParams) => deleteProductImages(productId, payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                useProductStore.getState().updateProductInStore(response.data);
            }
        },
    });
};
