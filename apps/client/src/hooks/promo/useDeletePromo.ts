import { deletePromo } from "@/api/promo";
import queryClient from "@/lib/queryClient";
import { usePromoStore } from "@/store/promo.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { VerifiedResponse } from "@/types/auth.types";
import { useMutation } from "@tanstack/react-query";

export const useDeletePromo = () => {
    return useMutation<SuccessResponse<VerifiedResponse>, FailureResponse, string>({
        mutationFn: (promoId: string) => deletePromo(promoId),
        onSuccess: (_response, promoId) => {
            queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
            usePromoStore.getState().deletePromoFromStore(promoId);
        },
    });
};
