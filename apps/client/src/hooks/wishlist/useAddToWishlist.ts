import { useMutation } from "@tanstack/react-query";
import { addToWishlist } from "@/api/wishlist";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse, WishlistResponse } from "@/types";
import type { WishlistProductSchema } from "@repo/types";

export const useAddToWishlist = () => {
    return useMutation<SuccessResponse<WishlistResponse>, FailureResponse, WishlistProductSchema>({
        mutationFn: addToWishlist,
        onSuccess: (response) => {
            // The response is the whole wishlist, so it seeds the cache (and the navbar badge)
            // directly instead of refetching.
            queryClient.setQueryData(["wishlist"], response);
        },
    });
};
