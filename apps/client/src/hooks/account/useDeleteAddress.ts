import { deleteAddress } from "@/api/address";
import queryClient from "@/lib/queryClient";
import type { AddressListResponse, FailureResponse, SuccessResponse } from "@/types";
import { useMutation } from "@tanstack/react-query";

export const useDeleteAddress = () => {
    return useMutation<SuccessResponse<AddressListResponse>, FailureResponse, string>({
        mutationFn: (addressId: string) => deleteAddress(addressId),
        onSuccess: (response) => {
            queryClient.setQueryData(["addresses"], response);
        },
    });
};
