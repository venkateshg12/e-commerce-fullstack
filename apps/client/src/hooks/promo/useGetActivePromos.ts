import { useQuery } from "@tanstack/react-query";
import { getActivePromos } from "@/api/promo";
import type { AdminPromosResponse, FailureResponse, SuccessResponse } from "@/types";

// Only fetched while the "View coupons" popup is open.
export const useGetActivePromos = (enabled: boolean) => {
    return useQuery<SuccessResponse<AdminPromosResponse>, FailureResponse>({
        queryKey: ["active-promos"],
        queryFn: getActivePromos,
        enabled,
        staleTime: 60 * 1000,
    });
};
