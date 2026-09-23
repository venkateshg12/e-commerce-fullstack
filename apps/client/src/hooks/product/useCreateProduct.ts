import { createProductMetadata } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import type { ProductSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

export const useCreateProduct = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, ProductSchema>({
        mutationFn: (data: ProductSchema) => createProductMetadata(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                const store = useProductStore.getState();
                store.addProduct(response.data);
                if (!response.data.images || response.data.images.length === 0) {
                    store.addPendingImageProductId(response.data._id);
                }
            }
        },
    });
};
