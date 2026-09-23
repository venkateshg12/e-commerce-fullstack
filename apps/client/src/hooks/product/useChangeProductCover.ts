import { changeProductCover } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import type { ChangeProductCoverSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type ChangeProductCoverParams = {
    productId: string;
    payload: ChangeProductCoverSchema;
};

export const useChangeProductCover = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, ChangeProductCoverParams>({
        mutationFn: ({ productId, payload }: ChangeProductCoverParams) => changeProductCover(productId, payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                useProductStore.getState().updateProductInStore(response.data);
            }
        },
    });
};
