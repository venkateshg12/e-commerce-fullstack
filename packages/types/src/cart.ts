import { z } from "zod";

export const productSizeSchema = z.enum(["S", "M", "L", "XL", "XXL"]);
export type ProductSize = z.infer<typeof productSizeSchema>;

export const addToCartSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
    quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }).default(1),
    color: z.string().trim().optional(),
    size: productSizeSchema.optional(),
    // Which of the product's photos was showing when this was added — must match one of
    // product.images[].url, validated server-side, so this can't inject an arbitrary URL.
    image: z.string().trim().optional(),
});

export type AddToCartSchema = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
    quantity: z.number().int().min(0, { message: "Quantity cannot be negative" }),
    color: z.string().trim().optional(),
    size: productSizeSchema.optional(),
});

export type UpdateCartItemSchema = z.infer<typeof updateCartItemSchema>;

export const deleteCartItemSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
    color: z.string().trim().optional(),
    size: productSizeSchema.optional(),
});

export type DeleteCartItemSchema = z.infer<typeof deleteCartItemSchema>;

export const syncCartItemSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
    quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }),
    color: z.string().trim().optional(),
    size: productSizeSchema.optional(),
    image: z.string().trim().optional(),
});

// Bounded: a guest cart is merged one line at a time, so an uncapped array is an easy way to make
// one request do unbounded work.
export const syncCartSchema = z.object({
    items: z.array(syncCartItemSchema).max(100).default([]),
});

export type SyncCartSchema = z.infer<typeof syncCartSchema>;
