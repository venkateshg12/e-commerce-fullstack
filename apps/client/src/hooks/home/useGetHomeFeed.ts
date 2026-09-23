import { useQuery } from "@tanstack/react-query";
import { getHomeFeed } from "@/api/home";
import type { FailureResponse, HomeFeedResponse, SuccessResponse } from "@/types";

// Unlike the cart and wishlist, the feed is public — guests and customers see the same page — so
// this is deliberately not gated on the signed-in user.
export const useGetHomeFeed = () => {
    return useQuery<SuccessResponse<HomeFeedResponse>, FailureResponse>({
        queryKey: ["home"],
        queryFn: getHomeFeed,
        staleTime: 5 * 60 * 1000,
    });
};
