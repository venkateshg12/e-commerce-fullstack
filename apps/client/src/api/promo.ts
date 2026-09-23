import type { AdminPromosResponse, PromoFormValues } from "@/types/promo.types";
import type { SuccessResponse } from "@/types/api.types";
import type { ApplyPromoResponse } from "@/types/checkout.types";
import type { ApplyPromoSchema, UpdatePromoSchema } from "@repo/types";
import API from "@/lib/api";
import type { VerifiedResponse } from "@/types/auth.types";

export const getPromos = async (): Promise<SuccessResponse<AdminPromosResponse>> => {
    const response = await API.get<SuccessResponse<AdminPromosResponse>>("/promos");
    return response.data;
};

export const createPromo = async (body: PromoFormValues): Promise<SuccessResponse<AdminPromosResponse>> => {
    const payload = {
        code: body.code,
        percentage: Number(body.percentage),
        count: Number(body.count),
        minimumOrderValue: Number(body.minimumOrderValue),
        startsAt: body.startsAt,
        endsAt: body.endsAt,
    };
    const response = await API.post<SuccessResponse<AdminPromosResponse>>("/promos", payload);
    return response.data;
};

export const updatePromo = async (
    promoId: string,
    body: UpdatePromoSchema
): Promise<SuccessResponse<any>> => {
    const payload: Record<string, any> = {};
    if (body.code !== undefined) payload.code = body.code;
    if (body.percentage !== undefined) payload.percentage = Number(body.percentage);
    if (body.count !== undefined) payload.count = Number(body.count);
    if (body.minimumOrderValue !== undefined) payload.minimumOrderValue = Number(body.minimumOrderValue);
    if (body.startsAt !== undefined) payload.startsAt = body.startsAt;
    if (body.endsAt !== undefined) payload.endsAt = body.endsAt;

    const response = await API.patch<SuccessResponse<any>>(`/promos/${promoId}`, payload);
    return response.data;
};

export const deletePromo = async (promoId: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.delete<SuccessResponse<{ message: string }>>(`/promos/${promoId}`);
    return response.data;
};

// Coupons a shopper can use right now: in their date window with uses left.
export const getActivePromos = async (): Promise<SuccessResponse<AdminPromosResponse>> => {
    const response = await API.get<SuccessResponse<AdminPromosResponse>>("/promos/active");
    return response.data;
};

// Customer-facing. Checks the code exists, is in its date window and has uses left — but NOT that
// the cart clears `minimumOrderValue`, so the caller has to compare that itself.
export const applyPromo = async (
    payload: ApplyPromoSchema
): Promise<SuccessResponse<ApplyPromoResponse>> => {
    const response = await API.post<SuccessResponse<ApplyPromoResponse>>("/promos/apply", payload);
    return response.data;
};