import { useMutation } from "@tanstack/react-query";
import { createCheckoutSession } from "@/api/checkout";
import type { CheckoutSessionResponse, FailureResponse, SuccessResponse } from "@/types";
import type { CreateCheckoutSessionSchema } from "@repo/types";

// Nothing is invalidated here: the cart is untouched until the payment is confirmed. The order row
// this writes stays at pending_payment if the user walks away from the Razorpay modal.
export const useCreateCheckoutSession = () => {
    return useMutation<
        SuccessResponse<CheckoutSessionResponse>,
        FailureResponse,
        CreateCheckoutSessionSchema
    >({
        mutationFn: createCheckoutSession,
    });
};
