import { getBrands } from "@/api/catalog";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Brand } from "@/types/product.types";
import { useQuery } from "@tanstack/react-query";

export const useGetBrands = () => {
    return useQuery<SuccessResponse<Brand[]>, FailureResponse>({
        queryKey: ["brands"],
        queryFn: getBrands,
        staleTime: 5 * 60 * 1000,
    });
};
