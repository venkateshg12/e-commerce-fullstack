import { useEffect, useState } from "react";
import type { Product } from "@/types/product.types";
import queryClient from "@/lib/queryClient";
import { useProductStore } from "@/store/product.store";
import { useGetBrands } from "@/hooks/brand/useGetBrands";
import { useGetCategories } from "./useGetCategories";
import { useGetProducts } from "./useGetProducts";
import { usePollPendingProducts } from "./usePollPendingProducts";


const useAdminProduct = () => {
    // Automatically polls specific pending products by ID every 15s until all images are ready
    usePollPendingProducts(15000);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!search.trim()) {
            setDebouncedSearch("");
            return;
        }

        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 200);

        return () => clearTimeout(timer);
    }, [search]);


    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [brandDialogOpen, setBrandDialogOpen] = useState(false);
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    // Track the id, not the product object. A frozen snapshot meant the edit dialog kept
    // rendering images that had already been deleted (and colour/cover changes never showed),
    // so acting on a stale tile sent a publicId the server no longer had.
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

 
    const {
        data: productsResponse,
        isLoading: isProductsLoading,
        isError: isProductsError,
    } = useGetProducts(debouncedSearch, page);

    const {
        data: categoriesResponse,
        isLoading: isCategoriesLoading,
        isError: isCategoriesError,
    } = useGetCategories();

    const { data: brandsResponse } = useGetBrands();

    const storeProducts = useProductStore((state) => state.products);
    const products: Product[] = productsResponse?.data ?? storeProducts ?? [];
    const productsMeta = productsResponse?.meta;
    const totalProducts = productsMeta?.total ?? products.length;
    const hasNextPage = productsMeta?.hasMore ?? false;
    const hasPreviousPage = page > 1;

    // Resolve the dialog's product live on every render. The store is checked first because
    // the image mutations write to it synchronously, while the invalidated query refetches
    // a moment later.
    const editingProduct: Product | null = editingProductId
        ? (storeProducts ?? []).find((item) => item._id === editingProductId) ??
          products.find((item) => item._id === editingProductId) ??
          null
        : null;

    const setEditingProduct = (product: Product | null) =>
        setEditingProductId(product?._id ?? null);
    const categories = categoriesResponse?.data ?? [];
    const brands = brandsResponse?.data ?? [];
    const loading = isProductsLoading || isCategoriesLoading;



    /*
      A new search is a new result set, so page 3 of the old one is meaningless. Reset happens in
      the handler rather than an effect, matching how the orders table does it.
     */
    const changeSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const openCreateDialog = () => {
        setEditingProductId(null);
        setProductDialogOpen(true);
    };

    const openEditDialog = (product: Product) => {
        setEditingProductId(product._id);
        setProductDialogOpen(true);
    };

    const closeProductDialog = () => {
        setProductDialogOpen(false);
        setEditingProductId(null);
    };

    const openCategoryDialog = () => {
        setCategoryDialogOpen(true);
    };

    const closeCategoryDialog = () => {
        setCategoryDialogOpen(false);
    };

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
        ]);
    };

    return {
        // Search State
        search,
        setSearch: changeSearch,

        // Pagination
        page,
        totalProducts,
        hasNextPage,
        hasPreviousPage,
        goToNextPage: () => setPage((current) => current + 1),
        goToPreviousPage: () => setPage((current) => Math.max(1, current - 1)),

        // Server Data & Status
        products,
        categories,
        brands,
        loading,
        isProductsError,
        isCategoriesError,

        // Cache Management
        refreshAll,

        // Dialog State & Action Helpers
        categoryDialogOpen,
        setCategoryDialogOpen,
        brandDialogOpen,
        setBrandDialogOpen,
        productDialogOpen,
        setProductDialogOpen,
        openCreateDialog,
        openEditDialog,
        closeProductDialog,
        editingProduct,
        setEditingProduct,
        openCategoryDialog,
        closeCategoryDialog,
    };
};

export default useAdminProduct;
