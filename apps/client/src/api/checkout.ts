import API from "@/lib/api";
import type {
    ConfirmCheckoutSessionSchema,
    CreateCheckoutSessionSchema,
    PayWithPointsSchema,
    ResumeCheckoutSessionSchema,
} from "@repo/types";
import type {
    CheckoutSessionResponse,
    ConfirmCheckoutResponse,
    PayWithPointsResponse,
    PointsResponse,
    SuccessResponse,
} from "@/types";

// Creates the Razorpay order. Has a side effect: a pending_payment order row is written each call.
export const createCheckoutSession = async (
    payload: CreateCheckoutSessionSchema
): Promise<SuccessResponse<CheckoutSessionResponse>> => {
    const response = await API.post<SuccessResponse<CheckoutSessionResponse>>(
        "/checkout/create-session",
        payload
    );
    return response.data;
};

// Re-opens payment for an order that was abandoned at the gateway. Returns the same shape as
// createCheckoutSession, but for the EXISTING Razorpay order — nothing new is created.
export const resumeCheckoutSession = async (
    payload: ResumeCheckoutSessionSchema
): Promise<SuccessResponse<CheckoutSessionResponse>> => {
    const response = await API.post<SuccessResponse<CheckoutSessionResponse>>(
        "/checkout/resume-session",
        payload
    );
    return response.data;
};

// Verifies the signature, decrements stock and removes the bought lines from the cart. Idempotent
// once the order is paid, so it is safe to retry after a network failure.
export const confirmCheckout = async (
    payload: ConfirmCheckoutSessionSchema
): Promise<SuccessResponse<ConfirmCheckoutResponse>> => {
    const response = await API.post<SuccessResponse<ConfirmCheckoutResponse>>(
        "/checkout/confirm",
        payload
    );
    return response.data;
};

export const getPoints = async (): Promise<SuccessResponse<PointsResponse>> => {
    const response = await API.get<SuccessResponse<PointsResponse>>("/checkout/points");
    return response.data;
};

export const payWithPoints = async (
    payload: PayWithPointsSchema
): Promise<SuccessResponse<PayWithPointsResponse>> => {
    const response = await API.post<SuccessResponse<PayWithPointsResponse>>(
        "/checkout/pay-with-points",
        payload
    );
    return response.data;
};
