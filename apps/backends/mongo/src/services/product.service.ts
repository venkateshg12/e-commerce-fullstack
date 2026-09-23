import crypto from "crypto";
import mongoose, { QueryFilter } from "mongoose";
import { cache } from "../utils/cache";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import BrandModel from "../models/brand.model";
import CategoryModel from "../models/category.model";
import SubCategoryModel from "../models/subCategory.model";
import ProductModel from "../models/product.model";
import { appAssert } from "../utils/errors";
import {
    addDeleteCloudinaryAssetsJob,
    addProcessProductImageJob,
} from "../jobs/producers/image.producer";
import {
    ProductAppliedFilterListQuery,
    ProductSchema,
    ProductSort,
    UpdateProductMetadataSchema,
    DeleteProductImagesSchema,
    ChangeProductCoverSchema,
    SetImageColorSchema,
} from "@repo/types";
import { ProductDocument, ProductImage, ProductSize, ProductVariant } from "../types/product.types";
import { getVariantKey } from "../utils/variants";

/*
  Product caching, and what each write actually invalidates.

  LISTINGS and the home feed are namespaced by the "products" version, so any product write bumps
  them all. That is deliberate: an edit can move a product into or out of any filter combination
  (its category, price or status may change), and they only live 60 seconds anyway.

  DETAIL entries are NOT namespaced — they are keyed per product and dropped one at a time. They
  used to share the "products" version, which meant editing one product threw away every other
  product's cached page for a full 5 minutes of TTL.

  FACETS have their own version, bumped only where the colour list can actually change.
 */
export const PRODUCT_LIST_TTL_SECONDS = 120;
export const PRODUCT_DETAIL_TTL_SECONDS = 5 * 60;
export const PRODUCT_FACETS_TTL_SECONDS = 30 * 60;

export const productDetailCacheKey = (productId: unknown) => `cache:product:detail:${String(productId)}`;

// One Redis round trip per batch rather than per product, for a rename covering a large brand.
const DELETE_CHUNK_SIZE = 500;

/**
 * Drops the cached detail pages of these products and nothing else. Called by every write that
 * changes a product — an admin edit, the image worker, and an order that moved stock. Never throws.
 */
export const invalidateProductDetails = async (productIds: Iterable<unknown>) => {
    const keys = [...new Set([...productIds].map(String))].map(productDetailCacheKey);

    for (let index = 0; index < keys.length; index += DELETE_CHUNK_SIZE) {
        await cache.del(...keys.slice(index, index + DELETE_CHUNK_SIZE));
    }
};

/**
 * The same, for every product matching a filter. A detail response embeds the names of the
 * category, brand and type it references (PRODUCT_POPULATE), so renaming one of those makes each
 * referencing product's cached page stale. Only renames need this: a create affects no product, and
 * a delete is refused while any product still references the document (`assertUnused`).
 */
export const invalidateProductDetailsWhere = async (filter: QueryFilter<ProductDocument>) => {
    const products = await ProductModel.find(filter).select("_id").lean();
    await invalidateProductDetails(products.map((product) => product._id));
};

// Every product response carries the names of what it references.
export const PRODUCT_POPULATE = [
    { path: "category", select: "name" },
    { path: "brand", select: "name" },
    { path: "subCategory", select: "name" },
];

const SORT_OPTIONS: Record<ProductSort, Record<string, 1 | -1>> = {
    recent: { createdAt: -1 },
    "price-low": { price: 1 },
    "price-high": { price: -1 },
};

// A shopper's search text goes into a regex, so anything with meaning in one is neutralised first.
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What a caller may see. Only an admin gets products that aren't active. */
type ProductVisibility = { includeInactive: boolean };

const buildProductQuery = (
    filters: ProductAppliedFilterListQuery,
    { includeInactive }: ProductVisibility
): QueryFilter<ProductDocument> => {
    const { search, category, brand, color, size, subCategory } = filters;

    return {
        ...(search && { title: { $regex: escapeRegExp(search), $options: "i" } }),
        ...(category && { category }),
        ...(brand && { brand }),
        ...(color && { colors: color }),
        ...(size && { sizes: size }),
        ...(subCategory && { subCategory }),
        ...(includeInactive ? {} : { status: "active" }),
    };
};

/*
  One cache entry per distinct result, keyed on the parsed filters in a fixed order — never the raw
  query string, so the same search doesn't split across keys because two parameters arrived in a
  different order, and a parameter the schema doesn't know can't reach the key at all.
 */
const productListCacheKey = (filters: ProductAppliedFilterListQuery) => {
    const { search, category, brand, color, size, subCategory, sort, page, limit } = filters;
    const fingerprint = crypto
        .createHash("sha1")
        .update(JSON.stringify([search?.toLowerCase(), category, brand, color, size, subCategory, sort, page, limit]))
        .digest("hex");

    return cache.versionedKey(["products"], `list:${fingerprint}`);
};

/**
 * One page of the catalogue, with the total so the caller knows whether to ask for another.
 *
 * Admins bypass the cache: they see inactive products, and caching that under the same key would
 * serve it to shoppers.
 */
export const listProductsService = async (
    filters: ProductAppliedFilterListQuery,
    visibility: ProductVisibility
) => {
    const query = buildProductQuery(filters, visibility);
    const { page, limit, sort } = filters;
    const cacheKey = visibility.includeInactive ? null : await productListCacheKey(filters);

    // The rows and the count are cached together: a count is its own query, and repeating it on
    // every request would undo most of what the cache is for.
    const { items, total } = await cache.getOrSet(
        cacheKey,
        async () => {
            const [items, total] = await Promise.all([
                ProductModel.find(query)
                    .populate(PRODUCT_POPULATE)
                    .sort(SORT_OPTIONS[sort])
                    .skip((page - 1) * limit)
                    .limit(limit),
                ProductModel.countDocuments(query),
            ]);
            return { items, total };
        },
        PRODUCT_LIST_TTL_SECONDS
    );

    return { items, page, limit, total, hasMore: page * limit < total };
};

export const getProductByIdService = async (
    productId: string,
    { includeInactive }: ProductVisibility
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    // A fetcher that throws caches nothing, so a missing product isn't remembered as missing.
    return cache.getOrSet(
        includeInactive ? null : productDetailCacheKey(productId),
        async () => {
            const product = await ProductModel.findOne({
                _id: productId,
                ...(includeInactive ? {} : { status: "active" }),
            }).populate(PRODUCT_POPULATE);

            appAssert(product, NOT_FOUND, "Product not found");
            return product;
        },
        PRODUCT_DETAIL_TTL_SECONDS
    );
};

/*
  The colours a storefront visitor can filter by. Deliberately ignores every other filter, so the
  facet list stays stable while filtering rather than collapsing to the current result's colours.
 */
export const getProductFacetsService = async () =>
    cache.getOrSet(
        await cache.versionedKey(["facets"], "colors"),
        async () => {
            const colors = await ProductModel.distinct("colors", { status: "active" });
            return { colors: colors.filter(Boolean).sort((a, b) => a.localeCompare(b)) };
        },
        PRODUCT_FACETS_TTL_SECONDS
    );

const assertCategoryExists = async (categoryId: string) => {
    appAssert(mongoose.isValidObjectId(categoryId), BAD_REQUEST, "Invalid category ID");
    const categoryExists = await CategoryModel.exists({ _id: categoryId });
    appAssert(categoryExists, NOT_FOUND, "Selected category does not exist");
};

const assertBrandExists = async (brandId: string) => {
    appAssert(mongoose.isValidObjectId(brandId), BAD_REQUEST, "Invalid brand ID");
    const brandExists = await BrandModel.exists({ _id: brandId });
    appAssert(brandExists, NOT_FOUND, "Selected brand does not exist");
};

const assertSubCategoryInCategory = async (subCategoryId: string, categoryId: string) => {
    appAssert(mongoose.isValidObjectId(subCategoryId), BAD_REQUEST, "Invalid type ID");
    const subCategory = await SubCategoryModel.findById(subCategoryId).select("category");
    appAssert(subCategory, NOT_FOUND, "Selected type does not exist");
    appAssert(
        String(subCategory.category) === String(categoryId),
        BAD_REQUEST,
        "Type does not belong to this category"
    );
};



/**
 * A variant's colour and size must be ones the product actually offers, and each combination may
 * appear only once — otherwise a cart line could name a row that no colour swatch leads to, or two
 * rows would claim the same stock and the atomic decrement would pick an arbitrary one.
 */
const assertVariantsMatchOptions = (
    variants: ProductVariant[],
    colors: string[],
    sizes: ProductSize[]
) => {
    const seen = new Set<string>();

    for (const variant of variants) {
        if (colors.length) {
            appAssert(
                variant.color && colors.includes(variant.color),
                BAD_REQUEST,
                `Stock row "${variant.color ?? "no colour"}" is not one of this product's colours`
            );
        } else {
            appAssert(!variant.color, BAD_REQUEST, "This product has no colours, so its stock rows can't name one");
        }

        if (sizes.length) {
            appAssert(
                variant.size && sizes.includes(variant.size),
                BAD_REQUEST,
                `Stock row "${variant.size ?? "no size"}" is not one of this product's sizes`
            );
        } else {
            appAssert(!variant.size, BAD_REQUEST, "This product has no sizes, so its stock rows can't name one");
        }

        const key = getVariantKey(variant.color, variant.size);
        appAssert(!seen.has(key), BAD_REQUEST, "The same colour and size appears twice in the stock rows");
        seen.add(key);
    }
};

export const createProductService = async (
    userId: string | mongoose.Types.ObjectId,
    data: ProductSchema
) => {
    await assertCategoryExists(data.category);
    await assertBrandExists(data.brand);
    if (data.subCategory) {
        await assertSubCategoryInCategory(data.subCategory, data.category);
    }

    assertVariantsMatchOptions(data.variants, data.colors, data.sizes);

    const product = await ProductModel.create({
        ...data,
        images: [],
        uploadStatus: "PENDING",
        createdBy: userId,
    });

    const createdProduct = await ProductModel.findById(product._id).populate(PRODUCT_POPULATE);
    // A new product can introduce colours, so the facet list changes too. Nothing to drop for the
    // product itself — it has never been cached.
    await cache.bump("products", "facets");
    return createdProduct;
};

export const updateProductMetadataService = async (
    productId: string,
    data: UpdateProductMetadataSchema
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    const existingProduct = await ProductModel.findById(productId);
    appAssert(existingProduct, NOT_FOUND, "Product not found");

    if (data.category) {
        await assertCategoryExists(data.category);
    }
    if (data.brand) {
        await assertBrandExists(data.brand);
    }

    /*
      Colours, sizes and stock rows are validated against each other as they will be AFTER this
      update: a request that drops a colour and its rows in one go is valid, while one that drops
      only the colour would leave rows pointing at an option the product no longer sells.
     */
    if (data.variants || data.colors || data.sizes) {
        assertVariantsMatchOptions(
            data.variants ?? existingProduct.variants,
            data.colors ?? existingProduct.colors ?? [],
            (data.sizes ?? existingProduct.sizes ?? []) as ProductSize[]
        );
    }

    const { subCategory, ...fields } = data;
    const finalCategory = data.category ?? String(existingProduct.category);
    const categoryChanged = finalCategory !== String(existingProduct.category);
    const update: { $set: Record<string, unknown>; $unset?: Record<string, 1> } = { $set: fields };

    if (subCategory) {
        await assertSubCategoryInCategory(subCategory, finalCategory);
        update.$set.subCategory = subCategory;
    } else if (subCategory === null || (subCategory === undefined && categoryChanged)) {
        // Cleared explicitly, or the category moved and the stored type belongs to the old one.
        update.$unset = { subCategory: 1 };
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
        productId,
        update,
        { new: true }
    ).populate(PRODUCT_POPULATE);

    await invalidateProductDetails([productId]);
    await cache.bump("products");
    // The facet list is the distinct colours of ACTIVE products, so only these two fields can move it.
    if (data.colors || data.status) {
        await cache.bump("facets");
    }
    return updatedProduct;
};


export const uploadProductImagesService = async (
    productId: string,
    files: Express.Multer.File[],
    // Index-aligned with `files` — the client appends one `imageColors` part per file part.
    imageColors: string[] = [],
    // Index to insert the batch at; undefined appends. Lets an edit keep existing photos first
    // and place each new batch ahead of earlier new uploads.
    position?: number
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    appAssert(files && files.length > 0, BAD_REQUEST, "At least one new image is required for upload");

    for (const file of files) {
        appAssert(
            file.buffer && file.buffer.length > 0,
            BAD_REQUEST,
            `File "${file.originalname || "upload"}" is empty`
        );
    }

    const existingProduct = await ProductModel.findById(productId);
    appAssert(existingProduct, NOT_FOUND, "Product not found");

    /*
      Colours are paired with files by position, so a mismatch would silently shift every colour
      after the missing one onto the wrong photo. Reject it instead — the client sends one
      `imageColors` part per file (an empty string for "no colour"), so the counts always match
      unless something dropped a part in transit.
     */
    appAssert(
        imageColors.length === 0 || imageColors.length === files.length,
        BAD_REQUEST,
        "Each image must have a colour slot — the colour list doesn't match the files sent"
    );

    // A photo's colour must be one the product actually offers: the cart validates a line's colour
    // against `product.colors`, so a colour that only exists on an image could never be bought.
    const palette = existingProduct.colors ?? [];
    for (const rawColor of imageColors) {
        const color = rawColor.trim();
        appAssert(
            !color || palette.includes(color),
            BAD_REQUEST,
            `"${color}" is not one of this product's colours — add it to the colour list first`
        );
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
        productId,
        {
            $set: { uploadStatus: "PENDING" },
            $unset: { uploadError: 1 },
        },
        { new: true }
    ).populate(PRODUCT_POPULATE);

    const filePayloads = files.map((file, index) => ({
        bufferBase64: file.buffer.toString("base64"),
        originalName: file.originalname,
        mimeType: file.mimetype,
        color: imageColors[index]?.trim() || undefined,
    }));

    try {
        await addProcessProductImageJob({
            productId,
            files: filePayloads,
            position,
        });
    } catch (queueErr) {
        await ProductModel.findByIdAndUpdate(productId, {
            $set: {
                uploadStatus: "FAILED",
                uploadError: "Failed to schedule image processing job. Please retry.",
            },
        });
        await invalidateProductDetails([productId]);
        await cache.bump("products");
        throw queueErr;
    }

    await invalidateProductDetails([productId]);
    await cache.bump("products");
    return updatedProduct;
};

export const deleteProductImagesService = async (
    productId: string,
    payload: DeleteProductImagesSchema
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    const product = await ProductModel.findById(productId);
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicIds } = payload;
    const currentImages: ProductImage[] = product.images || [];

    // Verify all requested publicIds exist in product images
    const deletePublicIdSet = new Set(publicIds);
    const imagesToDelete = currentImages.filter((img) => deletePublicIdSet.has(img.publicId));
    appAssert(
        imagesToDelete.length > 0,
        BAD_REQUEST,
        "None of the provided image publicIds match existing product images"
    );

    const remainingImages = currentImages.filter((img) => !deletePublicIdSet.has(img.publicId));
    appAssert(
        remainingImages.length >= 1,
        BAD_REQUEST,
        "Cannot delete all images. A product must have at least one remaining image."
    );

    // Check if any deleted image was a cover image
    const deletedWasCover = imagesToDelete.some((img) => img.isCover === true);
    const hasRemainingCover = remainingImages.some((img) => img.isCover === true);

    if (deletedWasCover && !hasRemainingCover && remainingImages.length > 0) {
        // Automatically reassign the first remaining image as cover
        remainingImages[0].isCover = true;
    }

    // Remove from Mongo atomically. `product.images = remaining; product.save()` was a
    // read-modify-write — the same lost-update shape already fixed on the upload path.
    await ProductModel.findByIdAndUpdate(productId, {
        $pull: { images: { publicId: { $in: publicIds } } },
    });

    // Reassign a cover only if the deleted image was the cover. The filter makes this a no-op
    // whenever a cover already survives, so it is safe to run unconditionally.
    await ProductModel.updateOne(
        { _id: productId, "images.isCover": { $ne: true } },
        { $set: { "images.0.isCover": true } }
    );

    // Destroying the Cloudinary assets is the slow part (one round-trip per asset) and nothing
    // in the UI depends on it, so it goes to the queue and the request returns immediately.
    await addDeleteCloudinaryAssetsJob({
        productId,
        publicIds: imagesToDelete.map((img) => img.publicId),
    });

    const updatedProduct = await ProductModel.findById(productId).populate(PRODUCT_POPULATE);
    await invalidateProductDetails([productId]);
    await cache.bump("products");
    return updatedProduct;
};

export const changeProductCoverService = async (
    productId: string,
    payload: ChangeProductCoverSchema
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    const product = await ProductModel.findById(productId);
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicId } = payload;
    const currentImages: ProductImage[] = product.images || [];

    const targetImageExists = currentImages.some((img) => img.publicId === publicId);
    appAssert(targetImageExists, NOT_FOUND, "Image with the specified publicId does not exist on this product");

    // Guarantee exactly one cover image. `color` must be carried across explicitly — the
    // previous version rebuilt only url/publicId/isCover, which silently dropped it.
    // (Listing fields rather than spreading, because these are Mongoose subdocuments.)
    product.images = currentImages.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        color: img.color,
        isCover: img.publicId === publicId,
    }));

    await product.save();

    const updatedProduct = await ProductModel.findById(productId).populate(PRODUCT_POPULATE);
    await invalidateProductDetails([productId]);
    await cache.bump("products");
    return updatedProduct;
};

export const setProductImageColorService = async (
    productId: string,
    payload: SetImageColorSchema
) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    const product = await ProductModel.findById(productId);
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicId, color } = payload;
    const currentImages: ProductImage[] = product.images || [];

    const targetImageExists = currentImages.some((img) => img.publicId === publicId);
    appAssert(targetImageExists, NOT_FOUND, "Image with the specified publicId does not exist on this product");

    // Same rule as on upload: only a colour from the product's own palette (or "" to clear it).
    const nextColor = color.trim();
    appAssert(
        !nextColor || (product.colors ?? []).includes(nextColor),
        BAD_REQUEST,
        `"${nextColor}" is not one of this product's colours — add it to the colour list first`
    );

    product.images = currentImages.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        isCover: img.isCover,
        color: img.publicId === publicId ? nextColor || undefined : img.color,
    }));

    await product.save();

    const updatedProduct = await ProductModel.findById(productId).populate(PRODUCT_POPULATE);
    await invalidateProductDetails([productId]);
    await cache.bump("products");
    return updatedProduct;
};

export const deleteProductService = async (productId: string) => {
    appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

    const product = await ProductModel.findById(productId);
    appAssert(product, NOT_FOUND, "Product not found");

    const publicIds = (product.images ?? []).map((img) => img.publicId).filter(Boolean);

    // Drop the document first so the admin's request returns straight away, then clean the
    // Cloudinary assets in the background instead of blocking on one round-trip per image.
    await ProductModel.findByIdAndDelete(productId);
    await invalidateProductDetails([productId]);
    // Its colours may have been the last of their kind, so the facet list changes too.
    await cache.bump("products", "facets");

    if (publicIds.length) {
        await addDeleteCloudinaryAssetsJob({ productId, publicIds });
    }

    return { message: "Product deleted. Image cleanup is running in the background." };
};

