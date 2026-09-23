import { useMutation } from "@tanstack/react-query";
import { payWithPoints } from "@/api/checkout";
import queryClient from "@/lib/queryClient";
import type { FailureResponse, PayWithPointsResponse, SuccessResponse } from "@/types";
import type { PayWithPointsSchema } from "@repo/types";

export const usePayWithPoints = () => {
    return useMutation<
        SuccessResponse<PayWithPointsResponse>,
        FailureResponse,
        PayWithPointsSchema
    >({
        mutationFn: payWithPoints,
        onSuccess: (response) => {
            // This endpoint clears the cart server-side, so the cached copy is stale.
            queryClient.invalidateQueries({ queryKey: ["cart"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            // `totalPoints` is the remaining balance, which is exactly what the points query holds.
            queryClient.setQueryData<SuccessResponse<{ points: number }>>(["checkout", "points"], {
                status: "success",
                data: { points: response.data.totalPoints },
            });
        },
    });
};
