import { useMutation } from "@tanstack/react-query";
import { deleteCartItem } from "@/api/cart";
import queryClient from "@/lib/queryClient";
import type { CartResponse, FailureResponse, SuccessResponse } from "@/types";
import type { DeleteCartItemSchema } from "@repo/types";

export const useDeleteCartItem = () => {
    return useMutation<SuccessResponse<CartResponse>, FailureResponse, DeleteCartItemSchema>({
        mutationKey: ["cart", "delete"],
        scope: { id: "cart" },
        mutationFn: deleteCartItem,
        onSuccess: (response) => {
            queryClient.setQueryData(["cart"], response);
        },
    });
};
