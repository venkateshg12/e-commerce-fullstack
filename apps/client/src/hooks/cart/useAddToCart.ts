import { useMutation } from "@tanstack/react-query";
import { addToCart } from "@/api/cart";
import queryClient from "@/lib/queryClient";
import type { CartResponse, FailureResponse, SuccessResponse } from "@/types";
import type { AddToCartSchema } from "@repo/types";

export const useAddToCart = () => {
    return useMutation<SuccessResponse<CartResponse>, FailureResponse, AddToCartSchema>({
        mutationKey: ["cart", "add"],
        // Shares the serial scope with the other cart mutations — see useUpdateCartItem.
        scope: { id: "cart" },
        mutationFn: addToCart,
        onSuccess: (response) => {
            // The response is the full cart, so no refetch is needed.
            queryClient.setQueryData(["cart"], response);
        },
    });
};
