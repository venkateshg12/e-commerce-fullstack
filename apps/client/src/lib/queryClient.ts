import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        }
    }
})

export default queryClient;

/**
 * Query keys holding data that belongs to the signed-in shopper. On logout the queries themselves
 * go quiet — they are gated on `user` — but their cached data stays, which is why the header kept
 * showing the old cart and wishlist counts. Dropping the entries is what actually empties them.
 *
 * `profile` is deliberately absent: AuthLoader keeps an observer on it for the whole session, so
 * removing it would send the query straight back out. Logout overwrites it with null instead.
 */
const USER_SCOPED_KEYS = [
    "cart",
    "wishlist",
    "orders",
    "addresses",
    "checkout",
    // Admin lists are only ever loaded by a signed-in admin.
    "admin-products",
    "admin-orders",
    "admin-promos",
    "admin-banners",
    "admin-categories",
    "admin-dashboard",
];

// Called wherever the session ends — logout, a failed refresh, a session that no longer resolves.
export const clearUserQueries = () => {
    for (const key of USER_SCOPED_KEYS) {
        queryClient.removeQueries({ queryKey: [key] });
    }
};
