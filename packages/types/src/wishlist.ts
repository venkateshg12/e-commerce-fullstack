import { z } from "zod";

export const wishlistProductSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
});

export type WishlistProductSchema = z.infer<typeof wishlistProductSchema>;

export const syncWishlistSchema = z.object({
    productIds: z.array(z.string().trim().min(1)).default([]),
});

export type SyncWishlistSchema = z.infer<typeof syncWishlistSchema>;
