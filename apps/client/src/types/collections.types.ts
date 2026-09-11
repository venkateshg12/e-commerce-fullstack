
export type ProductSort = "recent" | "price-low" | "price-high";

export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

export type ProductCategory = {
    _id: string;
    name: string;
};

export type ProductImage = {
    url: string;
    publicId: string;
    isCover: boolean;
};

export type CustomerProduct = {
    _id: string;
    title: string;
    description: string;
    category: ProductCategory;
    brand: string;
    stock: number;
    images: ProductImage[];
    colors: string[];
    sizes: ProductSize[];
    price: number;
    // Matches the Mongoose schema field name (product.model.ts), which is "salesPercentage".
    salesPercentage: number;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
};

export type GetCustomerProductsParams = {
    category?: string;
    brand?: string;
    color?: string;
    size?: string;
    sort?: ProductSort;
};

// GET /products/:id returns the product document on its own — there is no relatedProducts
// wrapper server-side, so related items are fetched separately by category.
export type CustomerProductDetailsResponse = CustomerProduct;

export type FacetKey = "category" | "brand" | "color" | "size";

export type CustomerProductFilters = {
    category: string;
    brand: string;
    color: string;
    size: string;
};

export type ActiveFilterBadge = {
    key: FacetKey;
    label: string;
    value: string;
};