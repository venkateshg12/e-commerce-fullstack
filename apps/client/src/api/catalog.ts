import API from "@/lib/api";
import type { BrandSchema, SubCategorySchema, UpdateSubCategorySchema } from "@repo/types";

// brands.

export const getBrands = async () => {
    const response = await API.get("/brands");
    return response.data;
}

export const createBrand = async (data: BrandSchema) => {
    const response = await API.post("/admin/brands", data);
    return response.data;
}

export const updateBrand = async (brandId: string, data: BrandSchema) => {
    const response = await API.put(`/admin/brands/${brandId}`, data);
    return response.data;
}

export const deleteBrand = async (brandId: string) => {
    const response = await API.delete(`/admin/brands/${brandId}`);
    return response.data;
}

// categories and their types (sub-categories).

export const deleteCategory = async (categoryId: string) => {
    const response = await API.delete(`/admin/categories/${categoryId}`);
    return response.data;
}

export const createSubCategory = async (data: SubCategorySchema) => {
    const response = await API.post("/admin/sub-categories", data);
    return response.data;
}

export const updateSubCategory = async (subCategoryId: string, data: UpdateSubCategorySchema) => {
    const response = await API.put(`/admin/sub-categories/${subCategoryId}`, data);
    return response.data;
}

export const deleteSubCategory = async (subCategoryId: string) => {
    const response = await API.delete(`/admin/sub-categories/${subCategoryId}`);
    return response.data;
}

