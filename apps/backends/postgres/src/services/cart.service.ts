import z from "zod";
import { AddToCartSchema, DeleteCartItemSchema, SyncCartSchema, UpdateCartItemSchema } from "@repo/types";
import { orm } from "../prisma/db";
import appAssert from "../utils/errors/appAssert";
import { BAD_REQUEST, NOT_FOUND } from "../constants/http";
import { getVariantKey } from "../utils/variants";
import { ProductSize } from "../types/product.types";

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

export const getCartItemService = async (userId: string) => {
    const cart = await orm.Cart
        .where({ userId })
        .include("items", (items) =>
            items.include("product", (product) =>
                product
                    .include("brand", (brand) => brand.select("id", "name"))
                    .include("images", (images) => images.orderBy((img) => img.position.asc()))
                    .include("variants")
            )
        )
        .first();

    const cartItems = cart?.items ?? [];

    const items = cartItems.flatMap((cartItem) => {
        const product = cartItem.product;
        if (!product) return [];

        const coverImage =
            product.images.find((img) => img.isCover)?.url ||
            product.images[0]?.url ||
            "";

        const finalPrice = product.salesPercentage
            ? Math.round(product.price - (product.price * product.salesPercentage) / 100)
            : product.price;

        const variantKey = getVariantKey(cartItem.color, cartItem.size);
        const matchingVariant = (product.variants ?? []).find(
            (v) => getVariantKey(v.color, v.size) === variantKey
        );
        const availableStock = matchingVariant?.stock ?? 0;

        return [
            {
                productId: product.id,
                title: product.title,
                brand: product.brand?.name ?? "",
                image: cartItem.image || coverImage,
                price: product.price,
                salesPercentage: product.salesPercentage ?? 0,
                colors: product.colors ?? [],
                sizes: product.sizes ?? [],
                finalPrice,
                totalStock: (product.variants ?? []).reduce(
                    (sum, v) => sum + (v.stock || 0),
                    0
                ),
                quantity: cartItem.quantity,
                color: cartItem.color,
                size: cartItem.size,
                availableStock,
            },
        ];
    });

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
        items,
        totalQuantity,
    };
};

export const addItemToCartService = async (
    userId: string,
    itemData: AddToCartSchema
) => {
    appAssert(isUuid(itemData.productId), BAD_REQUEST, "Invalid product ID");

    const product = await orm.Product
        .where({ id: itemData.productId, status: "active" })
        .include("variants")
        .include("images")
        .first();

    appAssert(product, NOT_FOUND, "Product not found");

    const color = itemData.color?.trim() || null;
    const size = (itemData.size?.trim() as ProductSize) || null;

    if ((product.colors ?? []).length > 0) {
        appAssert(color, BAD_REQUEST, "Color is required for this product");
        appAssert(
            (product.colors ?? []).includes(color),
            BAD_REQUEST,
            `Color ${color} is not available for this product`
        );
    } else {
        appAssert(!color, BAD_REQUEST, "This product has no colors");
    }

    if ((product.sizes ?? []).length > 0) {
        appAssert(size, BAD_REQUEST, "Size is required for this product");
        appAssert(
            (product.sizes ?? []).includes(size),
            BAD_REQUEST,
            `Size ${size} is not available for this product`
        );
    } else {
        appAssert(!size, BAD_REQUEST, "This product has no sizes");
    }

    const key = getVariantKey(color, size);
    const matchingVariant = (product.variants ?? []).find(
        (v) => getVariantKey(v.color, v.size) === key
    );
    const stock = matchingVariant?.stock ?? 0;

    appAssert(
        itemData.quantity <= stock,
        BAD_REQUEST,
        stock === 0
            ? "This size and colour is sold out"
            : `Only ${stock} left in this size and colour`
    );

    const image = itemData.image?.trim() || null;
    if (image) {
        appAssert(
            (product.images ?? []).some((img) => img.url === image),
            BAD_REQUEST,
            "Selected image does not belong to this product"
        );
    }

    // Ensure the user has a cart
    let cart = await orm.Cart.where({ userId }).select("id").first();
    if (!cart) {
        cart = await orm.Cart.create({ userId });
    }

    const cartId = cart.id;

    // Check if the specific (product, color, size) line already exists
    const existingItem = await orm.CartItem
        .where({
            cartId,
            productId: product.id,
            color: color ?? null,
            size: size ?? null,
        })
        .first();

    if (existingItem) {
        const nextQuantity = existingItem.quantity + itemData.quantity;
        appAssert(
            nextQuantity <= stock,
            BAD_REQUEST,
            `Only ${stock} left in this size and colour`
        );

        await orm.CartItem.where({ id: existingItem.id }).update({
            quantity: nextQuantity,
        });
    } else {
        await orm.CartItem.create({
            cartId,
            productId: product.id,
            quantity: itemData.quantity,
            color: color ?? null,
            size: size ?? null,
            image,
        });
    }

    return getCartItemService(userId);
};

export const syncCartItemService = async (
    userId: string,
    data: SyncCartSchema
) => {
    // Ensure the user has a cart
    let cart = await orm.Cart.where({ userId }).select("id").first();
    if (!cart) {
        cart = await orm.Cart.create({ userId });
    }

    const cartId = cart.id;

    // Filter valid UUID product IDs
    const requestedIds = [
        ...new Set(
            data.items
                .map((item) => item.productId.trim())
                .filter((id) => id && isUuid(id))
        ),
    ];

    const products = requestedIds.length
        ? await orm.Product
            .where({ status: "active" })
            .where((p) => p.id.in(requestedIds))
            .include("variants")
            .include("images")
            .all()
        : [];

    const productById = new Map(products.map((product) => [product.id, product]));
    const existingItems = await orm.CartItem.where({ cartId }).all();

    for (const rawItem of data.items) {
        const productId = rawItem.productId.trim();
        const quantity = rawItem.quantity;

        if (!productId || quantity < 1) {
            continue;
        }

        const product = productById.get(productId);
        if (!product) {
            continue;
        }

        const color = rawItem.color?.trim() || null;
        const size = (rawItem.size?.trim() as ProductSize) || null;

        // Check if colors/sizes are valid for this product
        if ((product.colors ?? []).length > 0) {
            if (!color || !(product.colors ?? []).includes(color)) {
                continue;
            }
        } else if (color) {
            continue;
        }

        if ((product.sizes ?? []).length > 0) {
            if (!size || !(product.sizes ?? []).includes(size)) {
                continue;
            }
        } else if (size) {
            continue;
        }

        const key = getVariantKey(color, size);
        const matchingVariant = (product.variants ?? []).find(
            (v) => getVariantKey(v.color, v.size) === key
        );
        const stock = matchingVariant?.stock ?? 0;

        // A guest's local cart can name a combination that has since sold out; skip it
        if (stock < 1) {
            continue;
        }

        const rawImage = rawItem.image?.trim() || null;
        const image =
            rawImage && (product.images ?? []).some((img) => img.url === rawImage)
                ? rawImage
                : null;

        const existing = existingItems.find(
            (item) =>
                item.productId === product.id &&
                (item.color || null) === color &&
                (item.size || null) === size
        );

        if (existing) {
            const nextQuantity = Math.min(existing.quantity + quantity, stock);
            existing.quantity = nextQuantity;
            await orm.CartItem.where({ id: existing.id }).update({
                quantity: nextQuantity,
            });
        } else {
            const newItem = await orm.CartItem.create({
                cartId,
                productId: product.id,
                quantity: Math.min(quantity, stock),
                color,
                size,
                image,
            });
            existingItems.push(newItem);
        }
    }

    return getCartItemService(userId);
};

export const updateCartItemService = async (
    userId: string,
    itemData: UpdateCartItemSchema
) => {
    appAssert(isUuid(itemData.productId), BAD_REQUEST, "Invalid product ID");

    const cart = await orm.Cart.where({ userId }).select("id").first();
    appAssert(cart, NOT_FOUND, "Cart not found");

    const color = itemData.color?.trim() || null;
    const size = (itemData.size?.trim() as ProductSize) || null;

    const cartItem = await orm.CartItem
        .where({
            cartId: cart.id,
            productId: itemData.productId,
            color,
            size,
        })
        .first();

    appAssert(cartItem, NOT_FOUND, "Item not found in cart");

    if (itemData.quantity <= 0) {
        await orm.CartItem.where({ id: cartItem.id }).delete();
    } else {
        const product = await orm.Product
            .where({ id: itemData.productId })
            .include("variants")
            .first();

        if (product) {
            const key = getVariantKey(color, size);
            const matchingVariant = (product.variants ?? []).find(
                (v) => getVariantKey(v.color, v.size) === key
            );
            const stock = matchingVariant?.stock ?? 0;

            appAssert(
                itemData.quantity <= stock,
                BAD_REQUEST,
                stock === 0
                    ? "This size and colour is sold out"
                    : `Only ${stock} left in this size and colour`
            );
        }

        await orm.CartItem.where({ id: cartItem.id }).update({
            quantity: itemData.quantity,
        });
    }

    return getCartItemService(userId);
};

export const deleteCartItemService = async (
    userId: string,
    itemData: DeleteCartItemSchema
) => {
    appAssert(isUuid(itemData.productId), BAD_REQUEST, "Invalid product ID");

    const cart = await orm.Cart.where({ userId }).select("id").first();
    appAssert(cart, NOT_FOUND, "Cart not found");

    const color = itemData.color?.trim() || null;
    const size = (itemData.size?.trim() as ProductSize) || null;

    await orm.CartItem
        .where({
            cartId: cart.id,
            productId: itemData.productId,
            color,
            size,
        })
        .deleteAll();

    return getCartItemService(userId);
};

export const clearCartService = async (userId: string) => {
    const cart = await orm.Cart.where({ userId }).select("id").first();
    if (cart) {
        await orm.CartItem.where({ cartId: cart.id }).deleteAll();
    }
    return getCartItemService(userId);
};
