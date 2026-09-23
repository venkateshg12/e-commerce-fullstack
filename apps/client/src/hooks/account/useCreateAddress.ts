import { createAddress } from "@/api/address";
import queryClient from "@/lib/queryClient";
import type { AddressListResponse, FailureResponse, SuccessResponse } from "@/types";
import type { AddressSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

export const useCreateAddress = () => {
    return useMutation<SuccessResponse<AddressListResponse>, FailureResponse, AddressSchema>({
        mutationFn: createAddress,
        onSuccess: (response) => {
            queryClient.setQueryData(["addresses"], response);
        },
    });
};
