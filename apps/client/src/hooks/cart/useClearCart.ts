import { useMutation } from "@tanstack/react-query";
import { clearCart } from "@/api/cart";
import queryClient from "@/lib/queryClient";
import type { CartResponse, FailureResponse, SuccessResponse } from "@/types";

export const useClearCart = () => {
    return useMutation<SuccessResponse<CartResponse>, FailureResponse, void>({
        mutationKey: ["cart", "clear"],
        scope: { id: "cart" },
        mutationFn: clearCart,
        onSuccess: (response) => {
            queryClient.setQueryData(["cart"], response);
        },
    });
};
