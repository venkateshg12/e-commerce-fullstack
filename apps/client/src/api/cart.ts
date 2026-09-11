import API from "@/lib/api";
import type { AddToCartSchema } from "@repo/types";
import type { SuccessResponse } from "@/types";

export const addToCart = async (
    payload: AddToCartSchema
): Promise<SuccessResponse<unknown>> => {
    const response = await API.post<SuccessResponse<unknown>>("/cart", payload);
    return response.data;
};
