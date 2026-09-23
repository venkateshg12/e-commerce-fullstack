import { useMutation } from "@tanstack/react-query";
import { cancelOrder } from "@/api/order";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, OrderStatus, SuccessResponse } from "@/types";

export const useCancelOrder = () => {
    return useMutation<
        SuccessResponse<{ _id: string; orderStatus: OrderStatus; cancelledAt: string | null }>,
        FailureResponse,
        string
    >({
        mutationFn: cancelOrder,
        // Refetch on failure too: a 409 means the order changed underneath (it was paid), so the
        // card the customer is looking at is stale either way.
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
    });
};
