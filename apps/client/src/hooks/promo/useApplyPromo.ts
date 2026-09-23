import { useMutation } from "@tanstack/react-query";
import { applyPromo } from "@/api/promo";
import type { ApplyPromoResponse, FailureResponse, SuccessResponse } from "@/types";
import type { ApplyPromoSchema } from "@repo/types";

// Applying a promo persists nothing server-side — it is a lookup. The caller keeps the code in
// local state and resends it as `promoCode` at checkout, where it is revalidated.
export const useApplyPromo = () => {
    return useMutation<SuccessResponse<ApplyPromoResponse>, FailureResponse, ApplyPromoSchema>({
        mutationFn: applyPromo,
    });
};
