import { uploadProductImages } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import { useMutation } from "@tanstack/react-query";

type UploadProductImagesParams = {
    productId: string;
    files: File[];
    // Index-aligned with `files`: the colour each photo depicts.
    colors?: string[];
    // Index to insert the batch at; undefined appends.
    position?: number;
};

export const useUploadProductImages = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, UploadProductImagesParams>({
        mutationFn: ({ productId, files, colors, position }: UploadProductImagesParams) =>
            uploadProductImages(productId, files, colors ?? [], position),
        onMutate: ({ productId }) => {
            useProductStore.getState().addPendingImageProductId(productId);
        },
        onSuccess: (response, { productId }) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                const store = useProductStore.getState();
                store.updateProductInStore(response.data);
                if (response.data.images && response.data.images.length > 0) {
                    store.removePendingImageProductId(productId);
                }
            }
        },
        onError: (_err, { productId }) => {
            useProductStore.getState().removePendingImageProductId(productId);
        },
    });
};
