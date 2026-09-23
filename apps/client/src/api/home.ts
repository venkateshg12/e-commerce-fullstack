import API from "@/lib/api";
import type { HomeFeedResponse, SuccessResponse } from "@/types";

export const getHomeFeed = async (): Promise<SuccessResponse<HomeFeedResponse>> => {
    const response = await API.get<SuccessResponse<HomeFeedResponse>>("/home");
    return response.data;
};
