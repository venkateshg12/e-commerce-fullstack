import { getCategories } from "@/api/product";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, SuccessResponse } from "@/types";
import type { Category } from "@/types/product.types";
import { useQuery } from "@tanstack/react-query";

export const useGetCategories = () => {
    return useQuery<SuccessResponse<Category[]>, FailureResponse>({
        queryKey: ["admin-categories"],
        queryFn: async () => {
            const response = await getCategories();
            if (response?.data) {
                useProductStore.getState().setCategories(response.data);
            }
            return response;
        },
        staleTime: 5 * 60 * 1000,
    });
};
