import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
    getCustomerProductFacets,
    getCustomerProducts,
} from "@/api/collection";
import { COLOR_FILTER_ENABLED } from "@/constants/constant";
import { useGetBrands } from "@/hooks/brand/useGetBrands";
import { useGetCustomerCategories } from "./useGetCustomerCategories";
import type {
    ActiveFilterBadge,
    CustomerProductFilters,
    FacetKey,
    GetCustomerProductsParams,
    ProductSort,
} from "@/types";

const FACET_LABELS: Record<FacetKey, string> = {
    category: "Category",
    subCategory: "Type",
    brand: "Brand",
    color: "Color",
    size: "Size",
};

export function useCollections() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters: CustomerProductFilters = {
        category: searchParams.get("category") || "",
        subCategory: searchParams.get("subCategory") || "",
        brand: searchParams.get("brand") || "",
        color: searchParams.get("color") || "",
        size: searchParams.get("size") || "",
    };

    const sort = (searchParams.get("sort") as ProductSort) || "recent";
    // Typed into the header search box; the URL is the only place it lives, so a shared link
    // reproduces the same result list.
    const search = searchParams.get("search") || "";

    const query: GetCustomerProductsParams = {
        search: search || undefined,
        category: filters.category || undefined,
        subCategory: filters.subCategory || undefined,
        brand: filters.brand || undefined,
        color: filters.color || undefined,
        size: filters.size || undefined,
        sort,
    };

    const categoriesQuery = useGetCustomerCategories();

    const brandsQuery = useGetBrands();

    /*
      Paged rather than "everything at once": the endpoint now serves one page, and the grid asks
      for the next when the shopper does. Changing a filter changes the key, which starts again at
      page one.
     */
    const productsQuery = useInfiniteQuery({
        // The key is compared structurally, so a fresh `query` object each render is fine.
        queryKey: ["customer-products", query],
        queryFn: ({ pageParam }) => getCustomerProducts({ ...query, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.meta?.hasMore ? (lastPage.meta.page ?? 1) + 1 : undefined,
        staleTime: 60 * 1000,
        // Keep the previous filter's results on screen while the new key loads, so a facet
        // toggle never empties the grid or collapses the page height.
        placeholderData: keepPreviousData,
    });


    // Distinct colors come from the backend rather than the client downloading the whole
    // catalog to dedupe them — stays stable while filtering, same as before.
    const facetsQuery = useQuery({
        queryKey: ["customer-product-facets"],
        queryFn: getCustomerProductFacets,
        staleTime: 5 * 60 * 1000,
        enabled: COLOR_FILTER_ENABLED,
    });

    const categories = categoriesQuery.data?.data ?? [];
    const brands = brandsQuery.data?.data ?? [];
    // Every page loaded so far, flattened into the one grid the page renders.
    const products = productsQuery.data?.pages.flatMap((page) => page.data) ?? [];
    const totalProducts = productsQuery.data?.pages[0]?.meta?.total ?? products.length;
    const availableColors = facetsQuery.data?.data.colors ?? [];

    const hasActiveFilters = Boolean(
        filters.category || filters.subCategory || filters.brand || filters.color || filters.size
    );

    /*
      Types belong to a category, so the list only ever shows one category's. With no category
      chosen there is still something to browse: the first category's types stand in, and picking
      a category swaps the list to that one's.
     */
    const activeCategory = filters.category
        ? categories.find((item) => item._id === filters.category)
        : categories[0];
    const subCategories = activeCategory?.subCategories ?? [];

    const activeFilterBadges: ActiveFilterBadge[] = (
        Object.keys(FACET_LABELS) as FacetKey[]
    )
        .filter((key) => filters[key])
        .map((key) => ({
            key,
            label: FACET_LABELS[key],
            // Category and brand are ids in the URL; show their names.
            value:
                key === "category"
                    ? categories.find((item) => item._id === filters.category)?.name ||
                      filters.category
                    : key === "subCategory"
                      ? subCategories.find((item) => item._id === filters.subCategory)?.name ||
                        filters.subCategory
                    : key === "brand"
                      ? brands.find((item) => item._id === filters.brand)?.name || filters.brand
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

            // The chosen type lives inside the old category, so it can't survive the switch.
            if (key === "category") {
                next.delete("subCategory");
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

    const applySearch = (value: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            const term = value.trim();

            if (term) {
                next.set("search", term);
            } else {
                next.delete("search");
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
        subCategories,
        activeCategoryName: activeCategory?.name ?? "",
        brands,
        products,
        totalProducts,
        // Cold load only — there is nothing at all to show yet.
        isInitialLoading: productsQuery.isPending,
        // A request is in flight, including a refetch behind kept-previous results.
        isFetching: productsQuery.isFetching,
        hasMore: productsQuery.hasNextPage,
        isLoadingMore: productsQuery.isFetchingNextPage,
        loadMore: () => productsQuery.fetchNextPage(),
        filters,
        sort,
        search,
        applySearch,
        hasActiveFilters,
        changeSort,
        availableColors,
        toggleFacet,
        clearFilters,
        activeFilterBadges,
    };
}
