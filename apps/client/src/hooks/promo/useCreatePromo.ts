import { createPromo } from "@/api/promo";
import queryClient from "@/lib/queryClient";
import { usePromoStore } from "@/store/promo.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { AdminPromosResponse, PromoFormValues } from "@/types/promo.types";
import { useMutation } from "@tanstack/react-query";

export const useCreatePromo = () => {
    return useMutation<SuccessResponse<AdminPromosResponse>, FailureResponse, PromoFormValues>({
        mutationFn: (data: PromoFormValues) => createPromo(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
            if (response?.data?.items) {
                // If items is an array or single item
                const items = response.data.items;
                if (Array.isArray(items)) {
                    if (items[0]) usePromoStore.getState().addPromo(items[0]);
                } else {
                    usePromoStore.getState().addPromo(items as any);
                }
            }
        },
    });
};
