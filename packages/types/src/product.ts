import { z } from "zod";
// The size enum is already defined for cart lines; a second copy here would be a second
// source of truth for the same five values.
import { productSizeSchema } from "./cart";

export const categorySchema = z.object({
    name: z.string().trim().min(1, { message: "Category name is required" }).max(100),
});

export type CategorySchema = z.infer<typeof categorySchema>;

// A product "type" (Shirt, Jeans…) is a sub-category that belongs to exactly one category.
export const subCategorySchema = z.object({
    name: z.string().trim().min(1, { message: "Type name is required" }).max(100),
    category: z.string().trim().min(1, { message: "Category is required" }),
});

export type SubCategorySchema = z.infer<typeof subCategorySchema>;

export const updateSubCategorySchema = z.object({
    name: z.string().trim().min(1, { message: "Type name is required" }).max(100),
});

export type UpdateSubCategorySchema = z.infer<typeof updateSubCategorySchema>;

export const brandSchema = z.object({
    name: z.string().trim().min(1, { message: "Brand name is required" }).max(100),
});

export type BrandSchema = z.infer<typeof brandSchema>;

/*
  Stock belongs to a variant, not to the product: a shirt can be out of green/L while green/M is
  on the shelf. `color` and `size` are optional because a product need not have either — a product
  with no colours and no sizes carries a single variant with both absent.
*/
export const productVariantSchema = z.object({
    color: z.string().trim().min(1).optional(),
    size: productSizeSchema.optional(),
    stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer" }),
});

export type ProductVariantSchema = z.infer<typeof productVariantSchema>;

export const createProductSchema = z.object({
    title: z.string().trim().min(1, { message: "Title is required" }).max(255),
    description: z.string().trim().min(1, { message: "Description is required" }),
    category: z.string().trim().min(1, { message: "Category is required" }),
    // Brand id
    brand: z.string().trim().min(1, { message: "Brand is required" }),
    price: z.coerce.number().min(0, { message: "Price must be a non-negative number" }),
    salesPercentage: z.coerce.number().min(0).max(100).default(0),
    colors: z.array(z.string()).default([]),
    sizes: z.array(productSizeSchema).default([]),
    // One row per (colour, size) the product is sold in. The service checks each row's colour and
    // size against the two lists above.
    variants: z.array(productVariantSchema).min(1, { message: "At least one stock row is required" }),
    // Sub-category id; must belong to `category`.
    subCategory: z.string().trim().min(1).optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductSchema = z.infer<typeof createProductSchema>;

export const updateProductMetadataSchema = z.object({
    title: z.string().trim().min(1, { message: "Title cannot be empty" }).max(255).optional(),
    description: z.string().trim().min(1, { message: "Description cannot be empty" }).optional(),
    category: z.string().trim().min(1, { message: "Category cannot be empty" }).optional(),
    brand: z.string().trim().min(1, { message: "Brand cannot be empty" }).optional(),
    price: z.coerce.number().min(0, { message: "Price must be a non-negative number" }).optional(),
    salesPercentage: z.coerce.number().min(0).max(100).optional(),
    colors: z.array(z.string()).optional(),
    sizes: z.array(productSizeSchema).optional(),
    variants: z.array(productVariantSchema).min(1, { message: "At least one stock row is required" }).optional(),
    // null clears the type (e.g. after the category changed).
    subCategory: z.string().trim().min(1).nullable().optional(),
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

export const setImageColorSchema = z.object({
    publicId: z.string().trim().min(1, { message: "publicId is required" }),
    color: z.string().trim(),
});

export type SetImageColorSchema = z.infer<typeof setImageColorSchema>;

// Colours for the files in an images upload, index-aligned with the `images` file parts.
// A single-file upload arrives as a bare string, so coerce to an array.
export const uploadImageColorsSchema = z.object({
    imageColors: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .transform((value) => {
            if (value === undefined) return [] as string[];
            return Array.isArray(value) ? value : [value];
        }),
    // Where in the product's image list to insert this batch. Omitted = append at the end.
    // Arrives as a multipart text part, hence the coercion.
    position: z.coerce.number().int().min(0).optional(),
});

export type UploadImageColorsSchema = z.infer<typeof uploadImageColorsSchema>;

export const productSortSchema = z.enum(["recent", "price-low", "price-high"]);
export type ProductSort = z.infer<typeof productSortSchema>;

/*
  Page size for any listing. Capped so a caller can't ask for the whole collection in one request —
  which is what the product list used to return, with three populates per row.
 */
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// What a paginated response carries in the envelope's `meta`, alongside the rows in `data`.
export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
};

/*
  A Mongo ObjectId as it travels over the wire. Validated here rather than in the controller, so a
  malformed id is one 400 from the schema instead of a hand-written check per field — and the client
  gets the same rule. An empty string is "no filter", not a bad id: the UI drops a cleared facet by
  sending it empty.
 */
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const optionalObjectId = (label: string) =>
    z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.string().regex(OBJECT_ID_PATTERN, { message: `Invalid ${label} ID` }).optional()
    );

export const productAppliedFilterListQuerySchema = paginationQuerySchema.extend({
    // Capped: the term goes into an unindexed regex scan and into a cache key.
    search: z.string().trim().max(100).optional(),
    category: optionalObjectId("category"),
    brand: optionalObjectId("brand"),
    color: z.string().trim().max(50).optional(),
    // One of the sizes the catalogue actually sells: a junk value is a 400, not an empty page.
    size: z.preprocess((value) => (value === "" ? undefined : value), productSizeSchema.optional()),
    subCategory: optionalObjectId("type"),
    sort: productSortSchema.default("recent"),
});

export type ProductAppliedFilterListQuery = z.infer<typeof productAppliedFilterListQuerySchema>;