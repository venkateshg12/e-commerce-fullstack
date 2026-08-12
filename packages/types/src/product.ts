import { z } from "zod";

export const categorySchema = z.object({
    name: z.string().trim().min(1, { message: "Category name is required" }).max(100),
});

export type CategorySchema = z.infer<typeof categorySchema>;

export const createProductSchema = z.object({
    title: z.string().trim().min(1, { message: "Title is required" }).max(255),
    description: z.string().trim().min(1, { message: "Description is required" }),
    category: z.string().trim().min(1, { message: "Category is required" }),
    brand: z.string().trim().min(1, { message: "Brand is required" }),
    price: z.coerce.number().min(0, { message: "Price must be a non-negative number" }),
    stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer" }),
    salesPercentage: z.coerce.number().min(0).max(100).default(0),
    colors: z.array(z.string()).default([]),
    sizes: z.array(z.enum(["S", "M", "L", "XL", "XXL"])).default([]),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductSchema = z.infer<typeof createProductSchema>;

export const updateProductMetadataSchema = z.object({
    title: z.string().trim().min(1, { message: "Title cannot be empty" }).max(255).optional(),
    description: z.string().trim().min(1, { message: "Description cannot be empty" }).optional(),
    category: z.string().trim().min(1, { message: "Category cannot be empty" }).optional(),
    brand: z.string().trim().min(1, { message: "Brand cannot be empty" }).optional(),
    price: z.coerce.number().min(0, { message: "Price must be a non-negative number" }).optional(),
    stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer" }).optional(),
    salesPercentage: z.coerce.number().min(0).max(100).optional(),
    colors: z.array(z.string()).optional(),
    sizes: z.array(z.enum(["S", "M", "L", "XL", "XXL"])).optional(),
    status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateProductMetadataSchema = z.infer<typeof updateProductMetadataSchema>;

export const deleteProductImagesSchema = z.object({
    publicIds: z.array(z.string().trim().min(1, { message: "publicId cannot be empty" }))
        .min(1, { message: "At least one publicId is required for deletion" }),
});

export type DeleteProductImagesSchema = z.infer<typeof deleteProductImagesSchema>;

export const changeProductCoverSchema = z.object({
    publicId: z.string().trim().min(1, { message: "publicId is required" }),
});

export type ChangeProductCoverSchema = z.infer<typeof changeProductCoverSchema>;

export const productSortSchema = z.enum(["recent", "price-low", "price-high"]);
export type ProductSort = z.infer<typeof productSortSchema>;

export const productAppliedFilterListQuerySchema = z.object({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    color: z.string().trim().optional(),
    size: z.string().trim().optional(),
    sort: productSortSchema.default("recent"),
});

export type ProductAppliedFilterListQuery = z.infer<typeof productAppliedFilterListQuerySchema>;