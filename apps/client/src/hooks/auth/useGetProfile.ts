import { getProfileData } from "@/api/auth"
import type { FailureResponse, ProfileResponse, SuccessResponse } from "@/types";
import { useQuery } from "@tanstack/react-query"

export const useGetProfile = () => {
    return useQuery<SuccessResponse<ProfileResponse>, FailureResponse>({
        queryKey: ["profile"],
        queryFn: getProfileData,
        staleTime : 5 * 60 * 1000
    })
}