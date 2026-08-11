import { z } from "zod";

export const productSizeSchema = z.enum(["S", "M", "L", "XL", "XXL"]);
export type ProductSize = z.infer<typeof productSizeSchema>;

export const addToCartSchema = z.object({
    productId: z.string().trim().min(1, { message: "Product ID is required" }),
    quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }).default(1),
    color: z.string().trim().optional(),
    size: productSizeSchema.optional(),
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
});

export const syncCartSchema = z.object({
    items: z.array(syncCartItemSchema).default([]),
});

export type SyncCartSchema = z.infer<typeof syncCartSchema>;
