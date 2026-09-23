import API from "@/lib/api";
import type { SyncWishlistSchema, WishlistProductSchema } from "@repo/types";
import type { SuccessResponse, WishlistResponse } from "@/types";

export const getWishlist = async (): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.get<SuccessResponse<WishlistResponse>>("/wishlist");
    return response.data;
};

// Merges a guest's locally-kept wishlist into the account's on sign-in; already-saved products
// stay saved, and ids that no longer exist are ignored.
export const syncWishlist = async (
    data: SyncWishlistSchema
): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.post<SuccessResponse<WishlistResponse>>("/wishlist/sync", data);
    return response.data;
};

export const toggleWishlistItem = async (
    data: WishlistProductSchema
): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.post<SuccessResponse<WishlistResponse>>("/wishlist/toggle", data);
    return response.data;
};

// Adds without toggling: a product already in the wishlist stays there. Use this whenever the
// intent is "save it", since the toggle endpoint would remove an already-saved item.
export const addToWishlist = async (
    data: WishlistProductSchema
): Promise<SuccessResponse<WishlistResponse>> => {
    const response = await API.post<SuccessResponse<WishlistResponse>>("/wishlist", data);
    return response.data;
};
