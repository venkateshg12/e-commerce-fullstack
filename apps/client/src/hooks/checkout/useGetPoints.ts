import { useQuery } from "@tanstack/react-query";
import { getPoints } from "@/api/checkout";
import { useAuthStore } from "@/store/auth.store";
import type { FailureResponse, PointsResponse, SuccessResponse } from "@/types";

export const useGetPoints = () => {
    const user = useAuthStore((state) => state.user);

    return useQuery<SuccessResponse<PointsResponse>, FailureResponse>({
        queryKey: ["checkout", "points"],
        queryFn: getPoints,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};
