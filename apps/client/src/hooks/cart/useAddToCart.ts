import { useMutation } from "@tanstack/react-query";
import { addToCart } from "@/api/cart";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { AddToCartSchema } from "@repo/types";

export const useAddToCart = () => {
    return useMutation<SuccessResponse<unknown>, FailureResponse, AddToCartSchema>({
        mutationFn: addToCart,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
    });
};
