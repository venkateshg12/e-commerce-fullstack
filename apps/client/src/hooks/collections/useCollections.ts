import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getCustomerCategories, getCustomerProducts } from "@/api/collection";
import { COLOR_FILTER_ENABLED } from "@/constants/constant";
import type {
    ActiveFilterBadge,
    CustomerProductFilters,
    FacetKey,
    GetCustomerProductsParams,
    ProductSort,
} from "@/types";

const FACET_LABELS: Record<FacetKey, string> = {
    category: "Category",
    brand: "Brand",
    color: "Color",
    size: "Size",
};

export function useCollections() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters: CustomerProductFilters = {
        category: searchParams.get("category") || "",
        brand: searchParams.get("brand") || "",
        color: searchParams.get("color") || "",
        size: searchParams.get("size") || "",
    };

    const sort = (searchParams.get("sort") as ProductSort) || "recent";

    const query: GetCustomerProductsParams = {
        category: filters.category || undefined,
        brand: filters.brand || undefined,
        color: filters.color || undefined,
        size: filters.size || undefined,
        sort,
    };

    const categoriesQuery = useQuery({
        queryKey: ["customer-categories"],
        queryFn: getCustomerCategories,
        staleTime: 5 * 60 * 1000,
    });

    const productsQuery = useQuery({
        // The key is compared structurally, so a fresh `query` object each render is fine.
        queryKey: ["customer-products", query],
        queryFn: () => getCustomerProducts(query),
        staleTime: 60 * 1000,
        // Keep the previous filter's results on screen while the new key loads, so a facet
        // toggle never empties the grid or collapses the page height.
        placeholderData: keepPreviousData,
    });

    // Colors come from the unfiltered catalog so the facet list stays stable while filtering.
    const colorsQuery = useQuery({
        queryKey: ["customer-products", {}],
        queryFn: () => getCustomerProducts(),
        staleTime: 5 * 60 * 1000,
        enabled: COLOR_FILTER_ENABLED,
        select: (response) => {
            const colors = new Set<string>();
            response.data?.forEach((item) => {
                item.colors?.forEach((color) => colors.add(color));
            });
            return Array.from(colors).sort((a, b) => a.localeCompare(b));
        },
    });

    const categories = categoriesQuery.data?.data ?? [];
    const products = productsQuery.data?.data ?? [];
    const availableColors = colorsQuery.data ?? [];

    const hasActiveFilters = Boolean(
        filters.category || filters.brand || filters.color || filters.size
    );

    const activeFilterBadges: ActiveFilterBadge[] = (
        Object.keys(FACET_LABELS) as FacetKey[]
    )
        .filter((key) => filters[key])
        .map((key) => ({
            key,
            label: FACET_LABELS[key],
            value:
                key === "category"
                    ? categories.find((item) => item._id === filters.category)?.name ||
                      filters.category
                    : filters[key],
        }));

    const toggleFacet = (key: FacetKey, value: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);

            if (next.get(key) === value) {
                next.delete(key);
            } else {
                next.set(key, value);
            }

            return next;
        // Replace rather than push, so Back leaves the page instead of replaying every click.
        }, { replace: true });
    };

    const changeSort = (value: ProductSort) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);

            if (value === "recent") {
                next.delete("sort");
            } else {
                next.set("sort", value);
            }

            return next;
        }, { replace: true });
    };

    const clearFilters = () => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            (Object.keys(FACET_LABELS) as FacetKey[]).forEach((key) => next.delete(key));
            return next;
        }, { replace: true });
    };

    return {
        categories,
        products,
        // Cold load only — there is nothing at all to show yet.
        isInitialLoading: productsQuery.isPending,
        // A request is in flight, including a refetch behind kept-previous results.
        isFetching: productsQuery.isFetching,
        filters,
        sort,
        hasActiveFilters,
        changeSort,
        availableColors,
        toggleFacet,
        clearFilters,
        activeFilterBadges,
    };
}
