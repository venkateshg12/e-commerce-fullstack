import API from "@/lib/api"
import type {
    CategorySchema,
    ProductSchema,
    UpdateProductMetadataSchema,
    DeleteProductImagesSchema,
    ChangeProductCoverSchema,
} from "@repo/types";


export const getProducts = async (search?: string) => {
    const query = search?.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : `/products`
    const response = await API.get(query);
    return response.data;
}

export const getProductsById = async (productId: string) => {
    const response = await API.get(`/products/${productId}`);
    return response.data;
}

export const createProductMetadata = async (data: ProductSchema) => {
    const response = await API.post("/admin/products", data);
    return response.data;
}

export const updateProductMetadata = async (productId : string, data: UpdateProductMetadataSchema) => {
    const response = await API.patch(`/admin/products/${productId}`, data);
    return response.data;
}

export const uploadProductImages = async (productId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("images", file);
    });

    const response = await API.post(`/admin/products/${productId}/images`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}

export const deleteProductImages = async (productId: string, data: DeleteProductImagesSchema) => {
    const response = await API.delete(`/admin/products/${productId}/images`, { data });
    return response.data;
}

export const changeProductCover = async (productId: string, data: ChangeProductCoverSchema) => {
    const response = await API.patch(`/admin/products/${productId}/images/cover`, data);
    return response.data;
}

export const deleteProduct = async(productId : string) => {
    const response = await API.delete(`/admin/products/${productId}`);
    return response.data;
}


// categories.

export const getCategories = async () => {
    const response = await API.get("/admin/categories");
    return response.data;
}

export const createCategory = async (data: CategorySchema) => {
    const response = await API.post("/admin/categories", data);
    return response.data;
}

export const updateCategory = async (categoryId: string, data: CategorySchema) => {
    const response = await API.put(`/admin/categories/${categoryId}`, data);
    return response.data;
}