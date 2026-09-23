import API from "@/lib/api";
import type {
    CustomerProduct,
    CustomerProductDetailsResponse,
    GetCustomerProductsParams,
    ProductCategory,
    PaginatedResponse,
    ProductFacets,
    SuccessResponse,
} from "@/types";

export const getCustomerCategories = async (): Promise<SuccessResponse<ProductCategory[]>> => {
    const response = await API.get<SuccessResponse<ProductCategory[]>>("/categories");
    return response.data;
};

// One page of products. `meta` carries page/total/hasMore; `data` stays the array of rows.
export const getCustomerProducts = async (
    params?: GetCustomerProductsParams
): Promise<PaginatedResponse<CustomerProduct[]>> => {
    const response = await API.get<PaginatedResponse<CustomerProduct[]>>("/products", {
        params,
    });
    return response.data;
};

export const getCustomerProductFacets = async (): Promise<SuccessResponse<ProductFacets>> => {
    const response = await API.get<SuccessResponse<ProductFacets>>("/products/facets");
    return response.data;
};

export const getCustomerProductDetails = async (
    productId: string
): Promise<SuccessResponse<CustomerProductDetailsResponse>> => {
    const response = await API.get<SuccessResponse<CustomerProductDetailsResponse>>(
        `/products/${productId}`
    );
    return response.data;
};

