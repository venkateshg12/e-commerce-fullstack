import { useMutation } from "@tanstack/react-query";
import { updateCartItem } from "@/api/cart";
import queryClient from "@/lib/queryClient";
import type { CartResponse, FailureResponse, SuccessResponse } from "@/types";
import type { UpdateCartItemSchema } from "@repo/types";

export const useUpdateCartItem = () => {
    return useMutation<SuccessResponse<CartResponse>, FailureResponse, UpdateCartItemSchema>({
        mutationKey: ["cart", "update"],
        // Cart lines have no id, and PATCH takes an absolute quantity, so two in-flight writes could
        // otherwise land out of order and lose an increment. A shared scope makes every cart
        // mutation run strictly one at a time.
        scope: { id: "cart" },
        mutationFn: updateCartItem,
        onSuccess: (response) => {
            // The response IS the whole cart, so seed the cache with it rather than invalidating
            // and fetching the same bytes again.
            queryClient.setQueryData(["cart"], response);
        },
    });
};
