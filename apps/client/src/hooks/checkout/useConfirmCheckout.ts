import { useMutation } from "@tanstack/react-query";
import { confirmCheckout } from "@/api/checkout";
import queryClient from "@/lib/queryClient";
import type { ConfirmCheckoutResponse, FailureResponse, SuccessResponse } from "@/types";
import type { ConfirmCheckoutSessionSchema } from "@repo/types";

export const useConfirmCheckout = () => {
    return useMutation<
        SuccessResponse<ConfirmCheckoutResponse>,
        FailureResponse,
        ConfirmCheckoutSessionSchema
    >({
        mutationFn: confirmCheckout,
        onSuccess: () => {
            // The server empties the cart inside the payment transaction, and this response carries
            // only the order id — so here a refetch really is needed.
            queryClient.invalidateQueries({ queryKey: ["cart"] });
            // The order just flipped from "Payment pending" to "Placed".
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
};
