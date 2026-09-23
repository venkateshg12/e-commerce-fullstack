import API from "@/lib/api";
import type { AddressListResponse, SuccessResponse } from "@/types";
import type { AddressSchema, UpdateAddressSchema } from "@repo/types";

export const getAddresses = async (): Promise<SuccessResponse<AddressListResponse>> => {
    const response = await API.get<SuccessResponse<AddressListResponse>>("/address");
    return response.data;
}

export const createAddress = async (data: AddressSchema): Promise<SuccessResponse<AddressListResponse>> => {
    const response = await API.post<SuccessResponse<AddressListResponse>>("/address", data);
    return response.data;
}

export const updateAddress = async (addressId: string, data: UpdateAddressSchema): Promise<SuccessResponse<AddressListResponse>> => {
    const response = await API.patch<SuccessResponse<AddressListResponse>>(`/address/${addressId}`, data);
    return response.data;
}

export const deleteAddress = async (addressId: string): Promise<SuccessResponse<AddressListResponse>> => {
    const response = await API.delete<SuccessResponse<AddressListResponse>>(`/address/${addressId}`);
    return response.data;
}
