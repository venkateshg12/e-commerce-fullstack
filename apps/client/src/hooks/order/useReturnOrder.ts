import { useMutation } from "@tanstack/react-query";
import { returnOrder } from "@/api/order";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, OrderStatus, SuccessResponse } from "@/types";

export const useReturnOrder = () => {
    return useMutation<
        SuccessResponse<{ _id: string; orderStatus: OrderStatus; returnedAt: string | null }>,
        FailureResponse,
        string
    >({
        mutationFn: returnOrder,
        /*
          A return moves three things at once: the order's status, the customer's points balance
          (credited with the order total) and the product's stock. Refetch on failure too — a
          rejected return usually means the order already changed underneath.
         */
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["checkout", "points"] });
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
    });
};
