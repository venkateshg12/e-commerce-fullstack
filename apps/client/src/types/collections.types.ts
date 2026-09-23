
export type ProductSort = "recent" | "price-low" | "price-high";

export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

export type NamedRef = {
    _id: string;
    name: string;
};

export type ProductCategory = NamedRef & {
    subCategories?: NamedRef[];
};

export type ProductVariant = {
    color?: string;
    size?: ProductSize;
    stock: number;
};

export type ProductImage = {
    url: string;
    publicId: string;
    isCover: boolean;
    // Which colour this photo shows. Absent on images uploaded before colour tagging existed.
    color?: string;
};

export type CustomerProduct = {
    _id: string;
    title: string;
    description: string;
    category: ProductCategory;
    brand: NamedRef;
    // One count per (colour, size); a product is buyable while any row has stock left.
    variants: ProductVariant[];
    images: ProductImage[];
    colors: string[];
    sizes: ProductSize[];
    subCategory?: NamedRef;
    price: number;
    // Matches the Mongoose schema field name (product.model.ts), which is "salesPercentage".
    salesPercentage: number;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
};

export type GetCustomerProductsParams = {
    // Matched against the product title, case-insensitively, by the backend.
    search?: string;
    category?: string;
    brand?: string;
    color?: string;
    size?: string;
    subCategory?: string;
    sort?: ProductSort;
    // Server-side pagination; omitted, the backend serves the first page at its default size.
    page?: number;
    limit?: number;
};

// GET /products/:id returns the product document on its own — there is no relatedProducts
// wrapper server-side, so related items are fetched separately by category.
export type CustomerProductDetailsResponse = CustomerProduct;

export type ProductFacets = {
    colors: string[];
};

export type FacetKey = "category" | "subCategory" | "brand" | "color" | "size";

export type CustomerProductFilters = {
    category: string;
    // The type within a category — "Shirts" under "Men". Belongs to one category, so it is
    // cleared whenever the category changes.
    subCategory: string;
    brand: string;
    color: string;
    size: string;
};

export type ActiveFilterBadge = {
    key: FacetKey;
    label: string;
    value: string;
};