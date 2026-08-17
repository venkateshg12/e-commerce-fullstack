import { getPromos } from "@/api/promo";
import { usePromoStore } from "@/store/promo.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { AdminPromosResponse } from "@/types/coupon.types";
import { useQuery } from "@tanstack/react-query";

export const useGetPromos = () => {
    return useQuery<SuccessResponse<AdminPromosResponse>, FailureResponse>({
        queryKey: ["admin-promos"],
        queryFn: async () => {
            const response = await getPromos();
            if (response?.data?.items) {
                usePromoStore.getState().setPromos(response.data.items);
            }
            return response;
        },
        staleTime: 60 * 1000,
    });
};
