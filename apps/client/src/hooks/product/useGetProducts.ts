import { getProducts } from "@/api/product";
import { useProductStore } from "@/store/product.store";
import type { FailureResponse, PaginatedResponse } from "@/types";
import type { Product } from "@/types/product.types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

// The admin table shows one page at a time; the endpoint no longer returns the whole catalogue.
export const ADMIN_PRODUCTS_PAGE_SIZE = 20;

export const useGetProducts = (search: string = "", page: number = 1) => {
    return useQuery<PaginatedResponse<Product[]>, FailureResponse>({
        queryKey: ["admin-products", search, page],
        queryFn: async () => {
            const response = await getProducts(search, page, ADMIN_PRODUCTS_PAGE_SIZE);
            if (response?.data) {
                const store = useProductStore.getState();
                store.setProducts(response.data);

                // Automatically register products needing image processing for polling
                response.data.forEach((product) => {
                    if (product.uploadStatus === "PENDING" || product.uploadStatus === "PROCESSING") {
                        store.addPendingImageProductId(product._id);
                    }
                });
            }
            return response;
        },
        staleTime: 60 * 1000,
        // Paging keeps the current rows on screen instead of blanking the table for a moment.
        placeholderData: keepPreviousData,
    });
};
