export interface ProductVariant {
    color?: string;
    size?: ProductSize;
    stock: number;
}

export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";


export interface ProductImage {
    url: string;
    publicId: string;
    isCover?: boolean;
    color?: string;
}
