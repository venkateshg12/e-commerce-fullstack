import { syncCart } from "@/api/cart";
import { syncWishlist } from "@/api/wishlist";
import queryClient from "@/lib/queryClient";
import { clearGuestBag, getGuestCart, getGuestWishlist } from "@/lib/guestBag";

/**
 * Merges this browser's guest cart and wishlist into the account that just signed in, then clears
 * them. Called from every path that starts a session. Never throws: a failed merge must not stop
 * someone logging in, and the items stay in storage for the next attempt.
 */
export const mergeGuestBagIntoAccount = async () => {
    const items = getGuestCart();
    const productIds = getGuestWishlist();

    if (items.length === 0 && productIds.length === 0) return;

    try {
        if (items.length > 0) await syncCart({ items });
        if (productIds.length > 0) await syncWishlist({ productIds });

        clearGuestBag();

        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["cart"] }),
            queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
        ]);
    } catch (error) {
        console.warn("[guest bag] merge failed; items kept for the next sign-in", error);
    }
};
