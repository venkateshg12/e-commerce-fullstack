import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/api/dashboard";
import type { DashboardResponse, FailureResponse, SuccessResponse } from "@/types";

export const useGetDashboard = (days: number) => {
    return useQuery<SuccessResponse<DashboardResponse>, FailureResponse>({
        queryKey: ["admin-dashboard", days],
        queryFn: () => getDashboard(days),
        staleTime: 60 * 1000,
        // Switching the range keeps the current figures on screen (dimmed) until the new ones
        // land, instead of collapsing the page into skeletons.
        placeholderData: keepPreviousData,
    });
};
