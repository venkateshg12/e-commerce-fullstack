import { setProductImageColor } from "@/api/product";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Product } from "@/types/product.types";
import type { SetImageColorSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type SetProductImageColorParams = {
    productId: string;
    payload: SetImageColorSchema;
};

// Tags an already-uploaded photo with a colour. Mirrors useChangeProductCover: the store is
// written synchronously so the open dialog reflects the change before the refetch lands.
export const useSetProductImageColor = () => {
    return useMutation<SuccessResponse<Product>, FailureResponse, SetProductImageColorParams>({
        mutationFn: ({ productId, payload }: SetProductImageColorParams) =>
            setProductImageColor(productId, payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            if (response?.data) {
                useProductStore.getState().updateProductInStore(response.data);
            }
        },
    });
};
