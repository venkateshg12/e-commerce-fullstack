import { useMutation } from "@tanstack/react-query";
import { updateOrderStatus } from "@/api/order";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, OrderStatus, SuccessResponse } from "@/types";
import type { UpdateOrderStatusSchema } from "@repo/types";

type UpdateOrderStatusParams = {
    orderId: string;
    payload: UpdateOrderStatusSchema;
};

export const useUpdateOrderStatus = () => {
    return useMutation<
        SuccessResponse<{ _id: string; orderStatus: OrderStatus }>,
        FailureResponse,
        UpdateOrderStatusParams
    >({
        mutationFn: ({ orderId, payload }) => updateOrderStatus(orderId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            // Status counts and recent orders on the dashboard change with it.
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
    });
};
