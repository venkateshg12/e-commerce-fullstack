import API from "@/lib/api";
import type {
    AddToCartSchema,
    DeleteCartItemSchema,
    UpdateCartItemSchema,
} from "@repo/types";
import type { CartResponse, SuccessResponse } from "@/types";

export const getCart = async (): Promise<SuccessResponse<CartResponse>> => {
    const response = await API.get<SuccessResponse<CartResponse>>("/cart");
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
