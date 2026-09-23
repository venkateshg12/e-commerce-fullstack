import { updateAddress } from "@/api/address";
import queryClient from "@/lib/queryClient";
import type { AddressListResponse, FailureResponse, SuccessResponse } from "@/types";
import type { UpdateAddressSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdateAddressParams = {
    addressId: string;
    payload: UpdateAddressSchema;
};

export const useUpdateAddress = () => {
    return useMutation<SuccessResponse<AddressListResponse>, FailureResponse, UpdateAddressParams>({
        mutationFn: ({ addressId, payload }: UpdateAddressParams) => updateAddress(addressId, payload),
        onSuccess: (response) => {
            queryClient.setQueryData(["addresses"], response);
        },
    });
};
