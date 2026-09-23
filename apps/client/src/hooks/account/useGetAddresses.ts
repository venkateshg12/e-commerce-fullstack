import { getAddresses } from "@/api/address";
import type { AddressListResponse, FailureResponse, SuccessResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";

export const useGetAddresses = () => {
    return useQuery<SuccessResponse<AddressListResponse>, FailureResponse>({
        queryKey: ["addresses"],
        queryFn: getAddresses,
        staleTime: 5 * 60 * 1000,
    });
};
