import mongoose from "mongoose";

export interface ProductImage {
    url: string;
    publicId: string;
    isCover?: boolean;
    color?: string;
}

export { type ProductSort, type ProductAppliedFilterListQuery } from "@repo/types";

export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

/**
 * One sellable combination and its own count. `color`/`size` are absent for a product that has no
 * colours or no sizes, in which case the product carries a single variant.
 */
export interface ProductVariant {
    color?: string;
    size?: ProductSize;
    stock: number;
}

export interface ProductDocument extends mongoose.Document {
    title: string;
    description: string;
    category: mongoose.Types.ObjectId;
    brand: mongoose.Types.ObjectId;
    images: ProductImage[];
    // Stock lives here, one row per (colour, size) — there is no product-level total.
    variants: mongoose.Types.DocumentArray<ProductVariant & mongoose.Types.Subdocument>;
    colors: string[];
    sizes: ProductSize[];
    subCategory?: mongoose.Types.ObjectId;
    price: number;

    salesPercentage: number;
    status: "active" | "inactive";
    uploadStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
    uploadError?: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

