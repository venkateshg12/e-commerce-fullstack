import { useQuery } from "@tanstack/react-query";
import {
    getCustomerProductDetails,
    getCustomerProducts,
} from "@/api/collection";
import type { CustomerProduct } from "@/types";

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
    const subCategoryId = product?.subCategory?._id;
    const brandId = product?.brand?._id;

    // The backend has no "related products" endpoint, so each section reuses the catalog query
    // with a different filter. Keys match the collections page, so they share its cache.
    const sameTypeParams = { category: categoryId, subCategory: subCategoryId, sort: "recent" as const };
    const sameTypeQuery = useQuery({
        queryKey: ["customer-products", sameTypeParams],
        queryFn: () => getCustomerProducts(sameTypeParams),
        enabled: Boolean(categoryId && subCategoryId),
        staleTime: 60 * 1000,
    });

    const sameCategoryParams = { category: categoryId, sort: "recent" as const };
    const sameCategoryQuery = useQuery({
        queryKey: ["customer-products", sameCategoryParams],
        queryFn: () => getCustomerProducts(sameCategoryParams),
        enabled: Boolean(categoryId),
        staleTime: 60 * 1000,
    });

    const sameBrandParams = { brand: brandId, sort: "recent" as const };
    const sameBrandQuery = useQuery({
        queryKey: ["customer-products", sameBrandParams],
        queryFn: () => getCustomerProducts(sameBrandParams),
        enabled: Boolean(brandId),
        staleTime: 60 * 1000,
    });

    // Each section drops the current product and anything an earlier section already shows,
    // so a card never appears twice on the page.
    const seen = new Set<string>(productId ? [productId] : []);
    const take = (items: CustomerProduct[] | undefined) => {
        const picked = (items ?? [])
            .filter((item) => !seen.has(item._id))
            .slice(0, RELATED_LIMIT);
        picked.forEach((item) => seen.add(item._id));
        return picked;
    };

    const sameType = subCategoryId ? take(sameTypeQuery.data?.data) : [];
    const sameCategory = take(sameCategoryQuery.data?.data);
    const sameBrand = take(sameBrandQuery.data?.data);

    return {
        product,
        sameType,
        sameCategory,
        sameBrand,
        isLoading: productQuery.isPending,
        isError: productQuery.isError,
        error: productQuery.error,
    };
}
