import { useMutation } from "@tanstack/react-query";
import { toggleWishlistItem } from "@/api/wishlist";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, SuccessResponse, WishlistResponse } from "@/types";
import type { WishlistProductSchema } from "@repo/types";

export const useToggleWishlistItem = () => {
    return useMutation<
        SuccessResponse<WishlistResponse>,
        FailureResponse,
        WishlistProductSchema
    >({
        mutationFn: toggleWishlistItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wishlist"] });
        },
    });
};
