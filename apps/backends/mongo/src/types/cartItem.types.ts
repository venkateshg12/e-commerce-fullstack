import mongoose, { Mongoose, Types } from "mongoose";
import { ProductSize } from "./product.types";

export interface CartItemDocument extends mongoose.Document {
    product: Types.ObjectId
    quantity: number
    color?: string
    size?: ProductSize;
    image?: string;
}

export interface CartDocument extends mongoose.Document {
    user: Types.ObjectId;
    items: CartItemDocument[];
    createdAt: Date;
    updatedAt: Date;
}


export type ProductPreview = {
    _id: string;
    title: string;
    // Populated to just the name; null if the brand document was removed.
    brand: { name: string } | null;
    price: number;
    salesPercentage: number;
    colors: string[];
    sizes: ProductSize[];
    // Needed to tell how many of THIS line's (colour, size) are left, so the quantity selector
    // can cap at what the shopper can actually buy.
    variants: Array<{ color?: string; size?: ProductSize; stock: number }>;
    images: Array<{
        url: string;
        isCover?: boolean;
    }>;
};

export type CartPreview = {
    product: ProductPreview | null;
    quantity: number;
    color?: string;
    size?: ProductSize;
    image?: string;
};

export type SyncCartInput = {
    productId?: string;
    quantity?: number;
    color?: string;
    size?: ProductSize;
    image?: string;
};
