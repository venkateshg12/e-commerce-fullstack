import type { CartItem } from "@/types";

/**
 * A cart line has no `_id` server-side — it is identified by the (productId, color, size) triple,
 * which the backend compares as `(a.color || "") === (b.color || "")`. This builds the same
 * identity as a string, for React keys and for tracking which row is mid-request.
 */
export const getLineKey = (item: Pick<CartItem, "productId" | "color" | "size">) =>
    `${item.productId}|${item.color ?? ""}|${item.size ?? ""}`;

// The cart response carries no totals, so the subtotal is derived from the already-discounted
// per-unit `finalPrice`.
export const getCartSubtotal = (items: CartItem[]) =>
    items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);

export type CartGroup = {
    key: string;
    title: string;
    brand: string;
    productId: string;
    // The photo shown once for the whole card: the first variation's, falling back to any
    // variation that has one.
    image: string;
    // Every colour/size variation of this product, ordered by colour then size.
    lines: CartItem[];
};

// Sizes read in wearing order rather than alphabetically (L before M before S is nonsense).
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL"];

/**
 * Groups cart lines by product, so one product is one card however many colours and sizes of it
 * are in the bag. The lines themselves are untouched: each is still identified by the server's
 * (productId, color, size) triple, so quantity and remove still act on a single variation.
 */
export const getCartGroups = (items: CartItem[]): CartGroup[] => {
    const groups = new Map<string, CartGroup>();

    for (const item of items) {
        const group = groups.get(item.productId);

        if (group) {
            group.lines.push(item);
            group.image = group.image || item.image;
        } else {
            groups.set(item.productId, {
                key: item.productId,
                title: item.title,
                brand: item.brand,
                productId: item.productId,
                image: item.image,
                lines: [item],
            });
        }
    }

    for (const group of groups.values()) {
        group.lines.sort(
            (a, b) =>
                (a.color ?? "").localeCompare(b.color ?? "") ||
                SIZE_ORDER.indexOf(a.size ?? "") - SIZE_ORDER.indexOf(b.size ?? "")
        );
    }

    return [...groups.values()];
};
