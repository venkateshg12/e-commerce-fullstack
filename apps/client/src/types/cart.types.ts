import type { ProductSize } from "@repo/types";

// Shaped by getCartItemService on the backend. Note `colors` is every colour the product offers,
// while `color` is the one this line was added with — they are different things.
export type CartItem = {
    productId: string;
    title: string;
    brand: string;
    image: string;
    price: number;
    salesPercentage: number;
    colors: string[];
    sizes: ProductSize[];
    finalPrice: number;
    // The product's stock across every variant; `availableStock` below is this line's own.
    totalStock: number;
    quantity: number;
    color?: string;
    size?: ProductSize;
    // How many of THIS line's colour and size are left, so the quantity selector caps at what can
    // actually be bought rather than at the product's total.
    availableStock: number;
};

// Every cart endpoint (get, add, update, delete, clear) returns this same payload.
export type CartResponse = {
    items: CartItem[];
    totalQuantity: number;
};
