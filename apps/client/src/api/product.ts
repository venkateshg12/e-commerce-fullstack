import API from "@/lib/api"
import type {
    CategorySchema,
    ProductSchema,
    UpdateProductMetadataSchema,
    DeleteProductImagesSchema,
    ChangeProductCoverSchema,
    SetImageColorSchema,
} from "@repo/types";
import type { PaginatedResponse } from "@/types";
import type { Product } from "@/types/product.types";


export const getProducts = async (
    search?: string,
    page = 1,
    limit = 24
): Promise<PaginatedResponse<Product[]>> => {
    const response = await API.get<PaginatedResponse<Product[]>>("/products", {
        params: {
            search: search?.trim() || undefined,
            page,
            limit,
        },
    });
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

export const uploadProductImages = async (
    productId: string,
    files: File[],
    // Index-aligned with `files`: colors[i] is the colour that files[i] depicts.
    colors: string[] = [],
    // Index in the product's image list to insert this batch at; undefined appends.
    position?: number
) => {
    const formData = new FormData();
    // Appending both parts in one loop keeps the file and colour parts in matching order,
    // which is what lets the server pair them up by index.
    files.forEach((file, index) => {
        formData.append("images", file);
        formData.append("imageColors", colors[index] ?? "");
    });
    if (position !== undefined) {
        formData.append("position", String(position));
    }

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

// Tags an already-uploaded photo with one of the product's palette colours ("" clears it).
export const setProductImageColor = async (productId: string, data: SetImageColorSchema) => {
    const response = await API.patch(`/admin/products/${productId}/images/color`, data);
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