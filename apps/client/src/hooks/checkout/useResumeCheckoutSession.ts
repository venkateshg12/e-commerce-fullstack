import { useMutation } from "@tanstack/react-query";
import { resumeCheckoutSession } from "@/api/checkout";
import type { CheckoutSessionResponse, FailureResponse, SuccessResponse } from "@/types";
import type { ResumeCheckoutSessionSchema } from "@repo/types";

// Nothing is invalidated here: resuming only reads the stored order back. The orders list and cart
// are refreshed when the payment is actually confirmed.
export const useResumeCheckoutSession = () => {
    return useMutation<
        SuccessResponse<CheckoutSessionResponse>,
        FailureResponse,
        ResumeCheckoutSessionSchema
    >({
        mutationFn: resumeCheckoutSession,
    });
};
