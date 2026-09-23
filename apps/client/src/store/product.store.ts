import type { Category, Product } from "@/types/product.types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ProductStore {
  products: Product[];
  categories: Category[];
  editingProduct: Product | null;
  pendingImageProductIds: string[];

  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProductInStore: (product: Product) => void;
  deleteProductFromStore: (productId: string) => void;

  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategoryInStore: (category: Category) => void;

  setEditingProduct: (product: Product | null) => void;

  addPendingImageProductId: (id: string) => void;
  removePendingImageProductId: (id: string) => void;
}

export const useProductStore = create<ProductStore>()(
  devtools(
    (set) => ({
      products: [],
      categories: [],
      editingProduct: null,
      pendingImageProductIds: [],

      setProducts: (products) =>
        set({ products }, false, "setProducts"),

      addProduct: (product) =>
        set(
          (state) => ({
            products: [product, ...state.products.filter((p) => p._id !== product._id)],
          }),
          false,
          "addProduct"
        ),

      updateProductInStore: (updatedProduct) =>
        set(
          (state) => ({
            products: state.products.map((p) =>
              p._id === updatedProduct._id ? updatedProduct : p
            ),
          }),
          false,
          "updateProductInStore"
        ),

      deleteProductFromStore: (productId) =>
        set(
          (state) => ({
            products: state.products.filter((p) => p._id !== productId),
          }),
          false,
          "deleteProductFromStore"
        ),

      setCategories: (categories) =>
        set({ categories }, false, "setCategories"),

      addCategory: (category) =>
        set(
          (state) => ({
            categories: [category, ...state.categories.filter((c) => c._id !== category._id)],
          }),
          false,
          "addCategory"
        ),

      updateCategoryInStore: (updatedCategory) =>
        set(
          (state) => ({
            categories: state.categories.map((c) =>
              c._id === updatedCategory._id ? updatedCategory : c
            ),
          }),
          false,
          "updateCategoryInStore"
        ),

      setEditingProduct: (editingProduct) =>
        set({ editingProduct }, false, "setEditingProduct"),

      addPendingImageProductId: (id) =>
        set(
          (state) => ({
            pendingImageProductIds: state.pendingImageProductIds.includes(id)
              ? state.pendingImageProductIds
              : [...state.pendingImageProductIds, id],
          }),
          false,
          "addPendingImageProductId"
        ),

      removePendingImageProductId: (id) =>
        set(
          (state) => ({
            pendingImageProductIds: state.pendingImageProductIds.filter((item) => item !== id),
          }),
          false,
          "removePendingImageProductId"
        ),
    }),
    { name: "ProductStore" }
  )
);
