import { QueryClient } from "@tanstack/react-query";
import { isServerUnavailable } from "@/lib/serverStatus";
import { useServerStore } from "@/store/server.store";

// About a minute of patience in total — enough for a free-tier backend to finish booting.
const MAX_WAKE_RETRIES = 12;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Only "the server isn't up yet" is worth retrying; a 4xx or a business error would just
            // fail again. While a query retries it stays pending, so the page keeps its skeletons
            // instead of flipping to an error or empty state.
            retry: (failureCount, error) =>
                failureCount < MAX_WAKE_RETRIES &&
                isServerUnavailable((error as { status?: unknown } | null)?.status),
            retryDelay: (attempt) => Math.min(2000 * (attempt + 1), 5000),
        }
    }
})

// Safety net: a query that ran out of retries before the server finished waking is refetched the
// moment the server answers, rather than staying failed until the visitor reloads.
useServerStore.subscribe((state, previous) => {
    if (previous.status === "waking" && state.status === "ready") {
        queryClient.refetchQueries({
            type: "active",
            predicate: (query) => query.state.status === "error",
        });
    }
});

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
