import type { SyncCartSchema } from "@repo/types";

/*
  What a logged-out visitor put in their cart and wishlist, kept in this browser until they sign in.

  The cart and wishlist endpoints all require an account, so before this a visitor who clicked
  "Add to cart" got a request that could only 401 — and, because the interceptor treats a 401 as an
  expired session, the message "Session expired. Please log in again." for a session they never had.

  On sign-in the two `/sync` endpoints merge what is here into the real cart and wishlist; they were
  built for exactly this and were previously unreachable.
 */

const CART_KEY = "shopymart.guest.cart";
const WISHLIST_KEY = "shopymart.guest.wishlist";

// Mirrors the server's caps (syncCartSchema / syncWishlistSchema), so a merge can't be rejected
// wholesale for being too long.
const MAX_CART_ITEMS = 100;
const MAX_WISHLIST_ITEMS = 200;

export type GuestCartItem = SyncCartSchema["items"][number];

// Storage throws in private windows and when site data is blocked, and can hold anything a previous
// version wrote — so every read is guarded and anything unexpected is treated as empty.
const read = <T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed: unknown = JSON.parse(raw);
        return isValid(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
};

const write = (key: string, value: unknown) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // A full or unavailable store just means the bag isn't kept — never break the click.
    }
};

const remove = (key: string) => {
    try {
        window.localStorage.removeItem(key);
    } catch {
        /* see write() */
    }
};

const isCartItems = (value: unknown): value is GuestCartItem[] =>
    Array.isArray(value) && value.every((item) => item && typeof (item as GuestCartItem).productId === "string");

const isProductIds = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((id) => typeof id === "string");

export const getGuestCart = (): GuestCartItem[] => read(CART_KEY, isCartItems, []);

export const getGuestWishlist = (): string[] => read(WISHLIST_KEY, isProductIds, []);

// A line is the same line when the product, colour and size all match — the rule the cart itself
// uses server-side.
const isSameLine = (a: GuestCartItem, b: GuestCartItem) =>
    a.productId === b.productId && (a.color || "") === (b.color || "") && (a.size || "") === (b.size || "");

export const addGuestCartItem = (item: GuestCartItem) => {
    const items = getGuestCart();
    const existing = items.find((line) => isSameLine(line, item));

    if (existing) {
        existing.quantity += item.quantity;
    } else {
        if (items.length >= MAX_CART_ITEMS) return;
        items.push(item);
    }

    write(CART_KEY, items);
};

/** Returns true when the product ended up saved, false when it was removed. */
export const toggleGuestWishlistItem = (productId: string): boolean => {
    const ids = getGuestWishlist();
    const index = ids.indexOf(productId);

    if (index > -1) {
        ids.splice(index, 1);
        write(WISHLIST_KEY, ids);
        return false;
    }

    if (ids.length >= MAX_WISHLIST_ITEMS) return false;

    ids.push(productId);
    write(WISHLIST_KEY, ids);
    return true;
};

export const clearGuestBag = () => {
    remove(CART_KEY);
    remove(WISHLIST_KEY);
};
