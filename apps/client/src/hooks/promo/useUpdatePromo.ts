import { updatePromo } from "@/api/promo";
import queryClient from "@/lib/queryClient";
import { usePromoStore } from "@/store/promo.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { UpdatePromoSchema } from "@repo/types";
import { useMutation } from "@tanstack/react-query";

type UpdatePromoParams = {
    promoId: string;
    payload: UpdatePromoSchema;
};

export const useUpdatePromo = () => {
    return useMutation<SuccessResponse<any>, FailureResponse, UpdatePromoParams>({
        mutationFn: ({ promoId, payload }: UpdatePromoParams) => updatePromo(promoId, payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
            if (response?.data?.item) {
                usePromoStore.getState().updatePromoInStore(response.data.item);
            }
        },
    });
};
