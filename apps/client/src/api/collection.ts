import API from "@/lib/api";
import type {
    CustomerProduct,
    CustomerProductDetailsResponse,
    GetCustomerProductsParams,
    ProductCategory,
    SuccessResponse,
} from "@/types";

export const getCustomerCategories = async (): Promise<SuccessResponse<ProductCategory[]>> => {
    const response = await API.get<SuccessResponse<ProductCategory[]>>("/categories");
    return response.data;
};

export const getCustomerProducts = async (
    params?: GetCustomerProductsParams
): Promise<SuccessResponse<CustomerProduct[]>> => {
    const response = await API.get<SuccessResponse<CustomerProduct[]>>("/products", {
        params,
    });
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

