import { useQuery } from "@tanstack/react-query";
import {
    getCustomerProductDetails,
    getCustomerProducts,
} from "@/api/collection";

const RELATED_LIMIT = 8;

export function useProductDetails(productId?: string) {
    const productQuery = useQuery({
        queryKey: ["customer-product", productId],
        queryFn: () => getCustomerProductDetails(productId!),
        enabled: Boolean(productId),
        staleTime: 60 * 1000,
    });

    const product = productQuery.data?.data;
    const categoryId = product?.category?._id;

    // The backend has no "related products" endpoint, so reuse the catalog query filtered to
    // this product's category and drop the product itself out of the list.
    const relatedQuery = useQuery({
        queryKey: ["customer-products", { category: categoryId, sort: "recent" }],
        queryFn: () => getCustomerProducts({ category: categoryId, sort: "recent" }),
        enabled: Boolean(categoryId),
        staleTime: 60 * 1000,
        select: (response) =>
            (response.data ?? [])
                .filter((item) => item._id !== productId)
                .slice(0, RELATED_LIMIT),
    });

    return {
        product,
        relatedProducts: relatedQuery.data ?? [],
        isLoading: productQuery.isPending,
        isError: productQuery.isError,
        error: productQuery.error,
        isRelatedLoading: relatedQuery.isPending && Boolean(categoryId),
    };
}
