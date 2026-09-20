import API from "@/lib/api";
import type { WishlistProductSchema } from "@repo/types";
import type { SuccessResponse, WishlistResponse } from "@/types";

export const getWishlist = async (): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.get<SuccessResponse<WishlistResponse>>("/wishlist");
    return response.data;
};

export const toggleWishlistItem = async (
    data: WishlistProductSchema
): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.post<SuccessResponse<WishlistResponse>>("/wishlist/toggle", data);
    return response.data;
};
