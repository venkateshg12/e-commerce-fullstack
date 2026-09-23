import API from "@/lib/api";
import type { SuccessResponse, VerifiedResponse } from "@/types";
import type { AdminBannerResponse } from "@/types/settings.types";

export const getBanners = async (): Promise<SuccessResponse<AdminBannerResponse>> => {
    const response = await API.get<SuccessResponse<AdminBannerResponse>>("/settings/banners");
    return response.data;
}

// Removes a banner from the storefront and frees its Cloudinary asset (the server queues that).
export const deleteBanner = async (bannerId: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.delete<SuccessResponse<VerifiedResponse>>(`/settings/banners/${bannerId}`);
    return response.data;
};

export const uploadBanners = async (formData: FormData): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.post<SuccessResponse<VerifiedResponse>>("/settings/banners", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}