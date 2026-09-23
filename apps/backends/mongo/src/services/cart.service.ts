import mongoose, { Types } from "mongoose";
import { CartModel } from "../models/cartItem.model";
import ProductModel from "../models/product.model";
import { NOT_FOUND, BAD_REQUEST } from "../constants/https";
import { appAssert } from "../utils/errors";
import { findVariant, getVariantStock } from "../utils/variants";
import { CartPreview, ProductPreview } from "../types/cartItem.types";
import { ProductDocument, ProductSize } from "../types/product.types";
import {
    AddToCartSchema,
    UpdateCartItemSchema,
    DeleteCartItemSchema,
    SyncCartSchema,
} from "@repo/types";

export function formatProduct(product: ProductPreview) {
    const image =
        product.images.find((item) => item.isCover)?.url ||
        product.images[0]?.url ||
        "";

    const finalPrice = product.salesPercentage
        ? Math.round(product.price - (product.price * product.salesPercentage) / 100)
        : product.price;

    return {
        productId: String(product._id),
        title: product.title,
        brand: product.brand?.name ?? "",
        image,
        price: product.price,
        salesPercentage: product.salesPercentage ?? 0,
        colors: product.colors ?? [],
        sizes: product.sizes ?? [],
        finalPrice,
        // Across every variant: enough for "can this be bought at all", which is what a wishlist
        // card and a cart card need. Per-line availability is added separately where it matters.
        totalStock: (product.variants ?? []).reduce(
            (sum, variant) => sum + (variant.stock || 0),
            0
        ),
    };
}

export function getSelectedVariant(
    product: ProductDocument,
    colorValue?: string,
    sizeValue?: string
) {
    let color = colorValue?.trim();
    if (product.colors && product.colors.length > 0) {
        if (color && !product.colors.includes(color)) {
            appAssert(false, BAD_REQUEST, `Invalid color '${color}' for this product`);
        }
        color = color || product.colors[0];
    } else {
        color = undefined;
    }

    let size = sizeValue?.trim() as ProductSize | undefined;
    if (product.sizes && product.sizes.length > 0) {
        if (size && !product.sizes.includes(size)) {
            appAssert(false, BAD_REQUEST, `Invalid size '${size}' for this product`);
        }
        size = size || (product.sizes[0] as ProductSize);
    } else {
        size = undefined;
    }

    // The row that owns this combination's count. Absent means "not stocked", which every caller
    // treats as sold out rather than as unlimited.
    const variant = findVariant(product, color, size);

    return { color, size, variant, stock: variant?.stock ?? 0 };
}

export const getCartItemService = async (userId: string | Types.ObjectId) => {
    const cart = await CartModel.findOne({ user: userId }).populate({
        path: "items.product",
        select: "title brand price salesPercentage colors sizes images variants",
        populate: { path: "brand", select: "name" },
    });

    const cartItems = (cart?.items || []) as unknown as CartPreview[];

    const items = cartItems.flatMap((cartItem) => {
        if (!cartItem.product) return [];

        const formatted = formatProduct(cartItem.product);

        return [
            {
                ...formatted,
                // Prefer the photo that was showing when this line was added; fall back to the
                // product's cover/first photo for items added before this field existed.
                image: cartItem.image || formatted.image,
                quantity: cartItem.quantity,
                color: cartItem.color,
                size: cartItem.size,
                // This line's own availability, not the product's: green/L can be sold out while
                // green/M is not.
                availableStock: getVariantStock(
                    { variants: cartItem.product.variants } as never,
                    cartItem.color,
                    cartItem.size
                ),
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
    userId: string | Types.ObjectId,
    itemData: AddToCartSchema
) => {
    appAssert(
        mongoose.isValidObjectId(itemData.productId),
        BAD_REQUEST,
        "Invalid product ID"
    );

    const product = await ProductModel.findOne({
        _id: itemData.productId,
        status: "active",
    });

    appAssert(product, NOT_FOUND, "Product not found");

    const { color, size, stock } = getSelectedVariant(
        product,
        itemData.color,
        itemData.size
    );

    appAssert(
        itemData.quantity <= stock,
        BAD_REQUEST,
        stock === 0
            ? "This size and colour is sold out"
            : `Only ${stock} left in this size and colour`
    );

    // Must be one of this product's own photos — rejects an arbitrary client-supplied URL.
    const image = itemData.image?.trim();
    if (image) {
        appAssert(
            product.images.some((img) => img.url === image),
            BAD_REQUEST,
            "Selected image does not belong to this product"
        );
    }

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
        cart = await CartModel.create({
            user: userId,
            items: [],
        });
    }

    const itemIndex = cart.items.findIndex(
        (item) =>
            item.product.toString() === String(product._id) &&
            (item.color || "") === (color || "") &&
            (item.size || "") === (size || "")
    );

    if (itemIndex > -1) {
        const nextQuantity = cart.items[itemIndex].quantity + itemData.quantity;

        appAssert(
            nextQuantity <= stock,
            BAD_REQUEST,
            `Only ${stock} left in this size and colour`
        );

        // A new image on a repeat add is intentionally NOT applied to the existing line — the
        // image, like the line's effective price, is fixed at creation.
        cart.items[itemIndex].quantity = nextQuantity;
    } else {
        cart.items.push({
            product: product._id,
            quantity: itemData.quantity,
            color,
            size,
            image,
        } as any);
    }

    await cart.save();
    return getCartItemService(userId);
};

export const syncCartItemService = async (
    userId: string | Types.ObjectId,
    data: SyncCartSchema
) => {
    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
        cart = await CartModel.create({
            user: userId,
            items: [],
        });
    }

    /*
      Every referenced product in one query rather than one per line: a guest cart of 100 lines was
      100 sequential round trips inside a single request.
     */
    const requestedIds = data.items
        .map((item) => item.productId.trim())
        .filter((productId) => productId && mongoose.isValidObjectId(productId));

    const products = await ProductModel.find({
        _id: { $in: requestedIds },
        status: "active",
    });

    const productById = new Map(products.map((product) => [String(product._id), product]));

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

        try {
            const { color, size, stock } = getSelectedVariant(
                product,
                rawItem.color,
                rawItem.size
            );

            // A guest's local cart can name a combination that has since sold out; skip it
            // rather than merging a line that can never be checked out.
            if (stock < 1) {
                continue;
            }

            const rawImage = rawItem.image?.trim();
            const image =
                rawImage && product.images.some((img) => img.url === rawImage)
                    ? rawImage
                    : undefined;

            const itemIndex = cart.items.findIndex(
                (item) =>
                    item.product.toString() === String(product._id) &&
                    (item.color || "") === (color || "") &&
                    (item.size || "") === (size || "")
            );

            if (itemIndex > -1) {
                const nextQuantity = cart.items[itemIndex].quantity + quantity;
                cart.items[itemIndex].quantity = Math.min(nextQuantity, stock);
            } else {
                cart.items.push({
                    product: product._id,
                    quantity: Math.min(quantity, stock),
                    color,
                    size,
                    image,
                } as any);
            }
        } catch {
            continue;
        }
    }

    await cart.save();
    return getCartItemService(userId);
};

export const updateCartItemService = async (
    userId: string | Types.ObjectId,
    itemData: UpdateCartItemSchema
) => {
    const cart = await CartModel.findOne({ user: userId });
    appAssert(cart, NOT_FOUND, "Cart not found");

    const itemIndex = cart.items.findIndex(
        (item) =>
            item.product.toString() === itemData.productId &&
            (item.color || "") === (itemData.color || "") &&
            (item.size || "") === (itemData.size || "")
    );

    appAssert(itemIndex > -1, NOT_FOUND, "Item not found in cart");

    if (itemData.quantity <= 0) {
        cart.items.splice(itemIndex, 1);
    } else {
        const product = await ProductModel.findById(itemData.productId);
        if (product) {
            const stock = getVariantStock(product, itemData.color, itemData.size);
            appAssert(
                itemData.quantity <= stock,
                BAD_REQUEST,
                stock === 0
                    ? "This size and colour is sold out"
                    : `Only ${stock} left in this size and colour`
            );
        }
        cart.items[itemIndex].quantity = itemData.quantity;
    }

    await cart.save();
    return getCartItemService(userId);
};

export const deleteCartItemService = async (
    userId: string | Types.ObjectId,
    itemData: DeleteCartItemSchema
) => {
    const cart = await CartModel.findOne({ user: userId });
    appAssert(cart, NOT_FOUND, "Cart not found");

    cart.items = cart.items.filter(
        (item) =>
            !(
                item.product.toString() === itemData.productId &&
                (item.color || "") === (itemData.color || "") &&
                (item.size || "") === (itemData.size || "")
            )
    ) as any;

    await cart.save();
    return getCartItemService(userId);
};

export const clearCartService = async (userId: string | Types.ObjectId) => {
    const cart = await CartModel.findOne({ user: userId });
    if (cart) {
        cart.items = [] as any;
        await cart.save();
    }
    return getCartItemService(userId);
};