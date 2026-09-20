import mongoose from "mongoose";
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
    ProductSchema,
    UpdateProductMetadataSchema,
    DeleteProductImagesSchema,
    ChangeProductCoverSchema,
    SetImageColorSchema,
} from "@repo/types";
import { ProductImage, ProductSize, ProductVariant } from "../types/product.types";
import { getVariantKey } from "../utils/variants";

// Every product response carries the names of what it references.
export const PRODUCT_POPULATE = [
    { path: "category", select: "name" },
    { path: "brand", select: "name" },
    { path: "subCategory", select: "name" },
];

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
        throw queueErr;
    }

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

    if (publicIds.length) {
        await addDeleteCloudinaryAssetsJob({ productId, publicIds });
    }

    return { message: "Product deleted. Image cleanup is running in the background." };
};

