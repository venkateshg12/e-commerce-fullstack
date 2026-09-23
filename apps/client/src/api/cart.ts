import API from "@/lib/api";
import type {
    AddToCartSchema,
    DeleteCartItemSchema,
    SyncCartSchema,
    UpdateCartItemSchema,
} from "@repo/types";
import type { CartResponse, SuccessResponse } from "@/types";

export const getCart = async (): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.get<SuccessResponse<CartResponse>>("/cart");
    return response.data;
};

/*
  Merges a guest's locally-kept cart into the signed-in account's cart. The server skips lines whose
  product is gone or whose colour/size sold out, so a stale guest bag can't fail the merge.
 */
export const syncCart = async (
    payload: SyncCartSchema
): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.post<SuccessResponse<CartResponse>>("/cart/sync", payload);
    return response.data;
};

export const addToCart = async (
    payload: AddToCartSchema
): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.post<SuccessResponse<CartResponse>>("/cart", payload);
    return response.data;
};

// `quantity` here is the line's new absolute total, not a delta. 0 removes the line.
export const updateCartItem = async (
    payload: UpdateCartItemSchema
): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.patch<SuccessResponse<CartResponse>>("/cart", payload);
    return response.data;
};

// The endpoint identifies the line by (productId, color, size) in the body, so the payload has to
// travel as `data` — a DELETE has no body slot of its own.
export const deleteCartItem = async (
    payload: DeleteCartItemSchema
): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.delete<SuccessResponse<CartResponse>>("/cart", { data: payload });
    return response.data;
};

export const clearCart = async (): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.delete<SuccessResponse<CartResponse>>("/cart/clear");
    return response.data;
};
