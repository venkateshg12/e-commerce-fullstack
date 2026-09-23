import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/order";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, OrderListResponse, SuccessResponse } from "@/types";

export const useGetOrders = () => {
    const user = useAuthStore((state) => state.user);

    return useQuery<SuccessResponse<OrderListResponse>, FailureResponse>({
        queryKey: ["orders"],
        queryFn: getOrders,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};
