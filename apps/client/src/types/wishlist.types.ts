import type { ProductSize } from "@repo/types";

export type WishlistItem = {
    productId: string;
    title: string;
    brand: string;
    image: string;
    price: number;
    salesPercentage: number;
    colors: string[];
    // Every size the product offers — the move-to-cart picker needs these.
    sizes: ProductSize[];
    finalPrice: number;
    // Summed across the product's variants — 0 means nothing is left in any colour or size.
    totalStock: number;
};

export type WishlistResponse = {
    items: WishlistItem[];
};
