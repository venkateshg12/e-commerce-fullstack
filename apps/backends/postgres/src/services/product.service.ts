import z from "zod";
import { ChangeProductCoverSchema, DeleteProductImagesSchema, ProductAppliedFilterListQuery, ProductSchema, ProductSort, SetImageColorSchema, UpdateProductMetadataSchema } from "@repo/types";
import appAssert from "../utils/errors/appAssert";
import { BAD_REQUEST, NOT_FOUND } from "../constants/http";
import { db, orm, pool } from "../prisma/db";
import { ProductSize, ProductVariant } from "../types/product.types";
import { getVariantKey } from "../utils/variants";

// Ids are uuid columns: a malformed one would make Postgres throw (a 500) instead of a clean 400.
const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

const assertCategoryExists = async (categoryId: string) => {
    appAssert(isUuid(categoryId), BAD_REQUEST, "Invalid category ID");
    const categoryExists = await orm.Category
        .where({ id: categoryId })
        .select("id")
        .first();
    appAssert(categoryExists, NOT_FOUND, "Selected category does not exist");
};

const assertBrandExists = async (brandId: string) => {
    appAssert(isUuid(brandId), BAD_REQUEST, "Invalid brand ID");
    const brandExists = await orm.Brand
        .where({ id: brandId })
        .select("id")
        .first();
    appAssert(brandExists, NOT_FOUND, "Selected brand does not exist");
};

const assertSubCategoryInCategory = async (subCategoryId: string, categoryId: string) => {
    appAssert(isUuid(subCategoryId), BAD_REQUEST, "Invalid type ID");
    const subCategory = await orm.SubCategory
        .where({ id: subCategoryId })
        .select("categoryId")
        .first();
    appAssert(subCategory, NOT_FOUND, "Selected type does not exist");
    appAssert(subCategory.categoryId === categoryId, BAD_REQUEST, "Type does not belong to this category");
};

/*
  Every stock row must name one of the product's colours and one of its sizes (or none, when the
  product has none), and no (colour, size) pair may appear twice. Synchronous on purpose: as an
  un-awaited async function its throws became unhandled rejections and invalid rows were saved.
 */
const assertVariantsMatchOptions = (
    variants: readonly ProductVariant[],
    colors: readonly string[],
    sizes: readonly ProductSize[]
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

/*
  The Postgres counterpart of the mongo backend's PRODUCT_POPULATE: a product with the names of its
  category, brand and type, plus its variants and images (embedded in the mongo document, separate
  tables here).
 */
const productsWithRelations = () =>
    orm.Product
        .include("category", (category) => category.select("id", "name"))
        .include("brand", (brand) => brand.select("id", "name"))
        .include("subCategory", (subCategory) => subCategory.select("id", "name"))
        .include("variants")
        .include("images", (images) => images.orderBy((img) => img.position.asc()));

export const findProductWithRelations = (productId: string) =>
    productsWithRelations().where({ id: productId }).first();

export const createProductService = async (userId: string, data: ProductSchema) => {
    await assertCategoryExists(data.category);
    await assertBrandExists(data.brand);
    if (data.subCategory) {
        await assertSubCategoryInCategory(data.subCategory, data.category);
    }

    assertVariantsMatchOptions(data.variants, data.colors, data.sizes);

    const { category, brand, subCategory, variants, ...fields } = data;

    // The variant rows are written through the relation, so the product and its stock are created
    // together. Images arrive later from the upload worker, so none are created here.
    const product = await orm.Product.create({
        ...fields,
        categoryId: category,
        brandId: brand,
        subCategoryId: subCategory ?? null,
        uploadStatus: "PENDING",
        createdBy: userId,
        variants: (variantRows) => variantRows.create(variants),
    });

    // No cache bump yet: the response cache arrives in a later phase. When it does, a new product
    // must bump "products" and "facets", as in the mongo backend.
    return findProductWithRelations(product.id);
};


export const uploadProductImagesService = async (
    productId: string,
    files: Express.Multer.File[],
    imageColors: string[] = [],
    position?: number
) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");
    appAssert(files && files.length > 0, BAD_REQUEST, "At least one new image is required for upload");

    for (const file of files) {
        appAssert(
            file.buffer && file.buffer.length > 0,
            BAD_REQUEST,
            `File "${file.originalname || "upload"}" is empty`
        );
    }

    const existingProduct = await orm.Product.
        where({ id: productId }).
        select("id", "colors").
        first();

    appAssert(existingProduct, NOT_FOUND, "Product not found");

    appAssert(
        imageColors.length === 0 || imageColors.length === files.length,
        BAD_REQUEST,
        "Each image must have a colour slot — the colour list doesn't match the files sent"
    );

    const palette = existingProduct.colors ?? [];
    for (const rawColor of imageColors) {
        const color = rawColor.trim();
        appAssert(
            !color || palette.includes(color),
            BAD_REQUEST,
            `"${color}" is not one of this product's colours — add it to the colour list first`
        );
    }

    // Mark the product as waiting for images, and clear the error left by any earlier failed upload.
    await orm.Product
        .where({ id: productId })
        .update({ uploadStatus: "PENDING", uploadError: null });
    const updatedProduct = await findProductWithRelations(productId);

    const filePayloads = files.map((file, index) => ({
        bufferBase64: file.buffer.toString("base64"),
        originalName: file.originalname,
        mimeType: file.mimetype,
        color: imageColors[index]?.trim() || undefined,
    }));

    // Phase 05 (jobs): enqueue the image-processing job here with `files`, `imageColors` and
    // `position`, marking the product FAILED if the job can't be scheduled.
    // Phase 08 (cache): invalidate this product's detail entry and bump "products".
    return updatedProduct;
}


export const deleteProductImagesService = async (
    productId: string,
    payload: DeleteProductImagesSchema
) => {

    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    const product = await orm.Product.where({ id: productId }).select("id").first();
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicIds } = payload;
    // Images are rows in product_images here, not an array on the product as in mongo.
    const currentImages = await orm.ProductImage
        .where({ productId })
        .select("id", "publicId", "isCover", "position")
        .orderBy((img) => img.position.asc())
        .all();

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

    // If the cover is among the deleted images, another image must become the cover.
    const deletedWasCover = imagesToDelete.some((img) => img.isCover);
    const hasRemainingCover = remainingImages.some((img) => img.isCover);

    // One transaction, so a failure can't leave the images deleted but the product without a cover.
    await db.transaction(async (tx) => {
        await tx.orm.public.ProductImage
            .where({ productId })
            .where((img) => img.publicId.in(publicIds))
            .deleteAll();

        if (deletedWasCover && !hasRemainingCover) {
            // The images were read in gallery order, so this is the first remaining photo — what
            // mongo's "images.0" meant.
            await tx.orm.public.ProductImage
                .where({ id: remainingImages[0]!.id })
                .update({ isCover: true });
        }
    });

    // Phase 05 (jobs): enqueue the Cloudinary asset deletion for imagesToDelete' publicIds here.
    // Phase 08 (cache): invalidate this product's detail entry and bump "products".
    return findProductWithRelations(productId);
}


export const changeProductCoverService = async (
    productId: string,
    payload: ChangeProductCoverSchema
) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    const product = await orm.Product.where({ id: productId }).select("id").first();
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicId } = payload;
    const targetImage = await orm.ProductImage
        .where({ productId, publicId })
        .select("id")
        .first();
    appAssert(targetImage, NOT_FOUND, "Image with the specified publicId does not exist on this product");

    /*
      Only the isCover column changes, so colour, url and position are untouched — mongo had to
      rebuild every image and carry `color` across by hand. The old cover is cleared before the new
      one is set because the product_image_one_cover index allows one cover per product; in one
      transaction, so a failure can't leave the product with no cover.
     */
    await db.transaction(async (tx) => {
        await tx.orm.public.ProductImage
            .where({ productId, isCover: true })
            .updateAll({ isCover: false });

        await tx.orm.public.ProductImage
            .where({ id: targetImage.id })
            .update({ isCover: true });
    });

    // Phase 08 (cache): invalidate this product's detail entry and bump "products".
    return findProductWithRelations(productId);
}


export const setProductImageColorService = async (
    productId: string,
    payload: SetImageColorSchema
) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    const product = await orm.Product.where({ id: productId }).select("id", "colors").first();
    appAssert(product, NOT_FOUND, "Product not found");

    const { publicId, color } = payload;
    const targetImage = await orm.ProductImage
        .where({ productId, publicId })
        .select("id")
        .first();
    appAssert(targetImage, NOT_FOUND, "Image with the specified publicId does not exist on this product");

    // Same rule as on upload: only a colour from the product's own palette (or "" to clear it).
    const nextColor = color.trim();
    appAssert(
        !nextColor || (product.colors ?? []).includes(nextColor),
        BAD_REQUEST,
        `"${nextColor}" is not one of this product's colours — add it to the colour list first`
    );

    // One column on one row, so the other images (and this one's cover flag) are untouched.
    // An empty colour clears it: null, where mongo left the field undefined.
    await orm.ProductImage
        .where({ id: targetImage.id })
        .update({ color: nextColor || null });

    // Phase 08 (cache): invalidate this product's detail entry and bump "products".
    return findProductWithRelations(productId);
};



export const updateProductMetadataService = async (
    productId: string,
    data: UpdateProductMetadataSchema
) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    const existingProduct = await orm.Product
        .where({ id: productId })
        .select("id", "categoryId", "colors", "sizes")
        .include("variants")
        .first();
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
        // Stored rows use null for "no colour/size"; the shared validator uses undefined.
        const storedVariants = existingProduct.variants.map((variant) => ({
            color: variant.color ?? undefined,
            size: variant.size ?? undefined,
            stock: variant.stock,
        }));
        assertVariantsMatchOptions(
            data.variants ?? storedVariants,
            data.colors ?? existingProduct.colors ?? [],
            (data.sizes ?? existingProduct.sizes ?? []) as ProductSize[]
        );
    }

    const { category, brand, subCategory, variants, ...fields } = data;
    const finalCategory = category ?? existingProduct.categoryId;
    const categoryChanged = finalCategory !== existingProduct.categoryId;

    // undefined = leave the stored type alone; null = clear it.
    let subCategoryId: string | null | undefined;
    if (subCategory) {
        await assertSubCategoryInCategory(subCategory, finalCategory);
        subCategoryId = subCategory;
    } else if (subCategory === null || (subCategory === undefined && categoryChanged)) {
        // Cleared explicitly, or the category moved and the stored type belongs to the old one.
        subCategoryId = null;
    }

    // One transaction: new stock rows can't be saved against a product whose update failed.
    await db.transaction(async (tx) => {
        await tx.orm.public.Product
            .where({ id: productId })
            .update({
                ...fields,
                ...(category ? { categoryId: category } : {}),
                ...(brand ? { brandId: brand } : {}),
                ...(subCategoryId !== undefined ? { subCategoryId } : {}),
                // The column default only fills it on insert; mongo's timestamps did this automatically.
                updatedAt: new Date().toISOString(),
            });

        if (variants) {
            // Carts and orders identify a variant by product + colour + size, never by row id, so
            // replacing the rows is safe. Delete first: the unique (product, colour, size) index
            // would reject a new row that matches one still there.
            await tx.orm.public.ProductVariant.where({ productId }).deleteAll();
            await tx.orm.public.ProductVariant.createAll(
                variants.map((variant) => ({ ...variant, productId }))
            );
        }
    });

    // Phase 08 (cache): invalidate this product's detail entry and bump "products"; bump "facets"
    // only when data.colors or data.status changed (the facet list is the colours of active products).
    return findProductWithRelations(productId);
};



export const deleteProductService = async (productId: string) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    // Phase 05 (jobs): read this product's image publicIds HERE, before the delete below cascades
    // away its image rows, and enqueue their Cloudinary deletion after it.

    /*
      One statement deletes the product and, through the foreign keys, its variants, images, cart
      lines and wishlist entries. Order lines are kept with productId set to null, so order history
      survives. `delete()` returns null when no row matched, which is the not-found case.
     */
    const deletedProduct = await orm.Product.where({ id: productId }).delete();
    appAssert(deletedProduct, NOT_FOUND, "Product not found");

    // Phase 08 (cache): invalidate this product's detail entry and bump "products" and "facets"
    // (its colours may have been the last of their kind).
    return { message: "Product deleted." };
};


/** What a caller may see. Only an admin gets products that aren't active. */
type ProductVisibility = { includeInactive: boolean };

// "id" breaks ties, so two products with the same price or timestamp can't swap between pages.
const SORT_SQL: Record<ProductSort, string> = {
    recent: `"createdAt" DESC, "id"`,
    "price-low": `"price" ASC, "id"`,
    "price-high": `"price" DESC, "id"`,
};

// In a LIKE pattern % and _ are wildcards and \ escapes them, so a shopper's text is made literal.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/*
  The WHERE clause for a listing, as SQL with $1, $2… placeholders and the values that fill them —
  never the values pasted into the SQL. Written by hand because the ORM has no "array contains",
  which the colour and size filters need.
 */
const buildProductQuery = (
    filters: ProductAppliedFilterListQuery,
    { includeInactive }: ProductVisibility
) => {
    const { search, category, brand, color, size, subCategory } = filters;
    const conditions: string[] = [];
    const params: unknown[] = [];

    // `sql` contains one "?", replaced with this value's placeholder number.
    const add = (sql: string, value: unknown) => {
        params.push(value);
        conditions.push(sql.replace("?", `$${params.length}`));
    };

    // ILIKE is case-insensitive, like mongo's $regex with "i"; the product_title_trgm index serves it.
    if (search) add(`"title" ILIKE ?`, `%${escapeLike(search)}%`);
    if (category) add(`"categoryId" = ?`, category);
    if (brand) add(`"brandId" = ?`, brand);
    if (subCategory) add(`"subCategoryId" = ?`, subCategory);
    // @> is "array contains", served by the product_colors_gin / product_sizes_gin indexes.
    if (color) add(`"colors" @> ARRAY[?]::text[]`, color);
    if (size) add(`"sizes" @> ARRAY[?]::text[]`, size);
    if (!includeInactive) conditions.push(`"status" = 'active'`);

    return {
        where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
};

export const listProductsService = async (
    filters: ProductAppliedFilterListQuery,
    visibility: ProductVisibility
) => {
    const { page, limit, sort } = filters;
    const { where, params } = buildProductQuery(filters, visibility);
    const pageParams = [...params, limit, (page - 1) * limit];

    // Two queries side by side: the ids on this page, and how many products match in total.
    const [pageResult, countResult] = await Promise.all([
        pool.query<{ id: string }>(
            `SELECT "id" FROM "public"."product" ${where}
             ORDER BY ${SORT_SQL[sort]}
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            pageParams
        ),
        pool.query<{ total: number }>(
            `SELECT count(*)::int AS "total" FROM "public"."product" ${where}`,
            params
        ),
    ]);

    const ids = pageResult.rows.map((row) => row.id);
    const total = countResult.rows[0]?.total ?? 0;

    // Then the full products, with the same relations as a detail page. `in` returns them in no
    // particular order, so they're put back into the order the sorted query chose.
    const products = ids.length
        ? await productsWithRelations().where((product) => product.id.in(ids)).all()
        : [];
    const position = new Map(ids.map((id, index) => [id, index]));
    const items = [...products].sort((a, b) => position.get(a.id)! - position.get(b.id)!);

    // Phase 08 (cache): cache { items, total } under productListCacheKey(filters) for 60s — only
    // for the public view, never when visibility.includeInactive.
    return { items, page, limit, total, hasMore: page * limit < total };
};

export const getProductByIdService = async (
    productId: string,
    { includeInactive }: ProductVisibility
) => {
    appAssert(isUuid(productId), BAD_REQUEST, "Invalid product ID");

    // A customer can't open an inactive product by its link; an admin can.
    const product = await productsWithRelations()
        .where(includeInactive ? { id: productId } : { id: productId, status: "active" })
        .first();
    appAssert(product, NOT_FOUND, "Product not found");

    // Phase 08 (cache): cache the public view under productDetailCacheKey(productId) for 5 minutes,
    // never when includeInactive, and only once found — a missing product must not be remembered.
    return product;
};
