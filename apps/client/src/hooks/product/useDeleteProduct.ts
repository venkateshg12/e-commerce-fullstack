import { deleteProduct } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useDeleteProduct = () => {
    return useMutation<SuccessResponse<null>, FailureResponse, string>({
        mutationFn: (productId: string) => deleteProduct(productId),
        onSuccess: (_response, productId) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            useProductStore.getState().deleteProductFromStore(productId);
        },
    });
};
