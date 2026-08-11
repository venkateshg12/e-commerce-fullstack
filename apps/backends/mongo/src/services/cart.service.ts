import mongoose, { Types } from "mongoose";
import { CartModel } from "../models/cartItem.model";
import ProductModel from "../models/product.model";
import { NOT_FOUND, BAD_REQUEST } from "../constants/https";
import { appAssert } from "../utils/errors";
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

    const finalPrice = product.salePercentage
        ? Math.round(product.price - (product.price * product.salePercentage) / 100)
        : product.price;

    return {
        productId: String(product._id),
        title: product.title,
        brand: product.brand,
        image,
        finalPrice,
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

    return { color, size };
}

export const getCartItemService = async (userId: string | Types.ObjectId) => {
    const cart = await CartModel.findOne({ user: userId }).populate(
        "items.product",
        "title brand price salePercentage images"
    );

    const cartItems = (cart?.items || []) as unknown as CartPreview[];

    const items = cartItems.flatMap((cartItem) => {
        if (!cartItem.product) return [];

        return [
            {
                ...formatProduct(cartItem.product),
                quantity: cartItem.quantity,
                color: cartItem.color,
                size: cartItem.size,
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

    const { color, size } = getSelectedVariant(
        product,
        itemData.color,
        itemData.size
    );

    appAssert(
        itemData.quantity <= product.stock,
        BAD_REQUEST,
        "Quantity is more than the stock of this product"
    );

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
            nextQuantity <= product.stock,
            BAD_REQUEST,
            "Quantity is more than the stock of this product"
        );

        cart.items[itemIndex].quantity = nextQuantity;
    } else {
        cart.items.push({
            product: product._id,
            quantity: itemData.quantity,
            color,
            size,
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

    for (const rawItem of data.items) {
        const productId = rawItem.productId.trim();
        const quantity = rawItem.quantity;

        if (!productId || !mongoose.isValidObjectId(productId) || quantity < 1) {
            continue;
        }

        const product = await ProductModel.findOne({
            _id: productId,
            status: "active",
        });

        if (!product || product.stock < 1) {
            continue;
        }

        try {
            const { color, size } = getSelectedVariant(
                product,
                rawItem.color,
                rawItem.size
            );

            const itemIndex = cart.items.findIndex(
                (item) =>
                    item.product.toString() === String(product._id) &&
                    (item.color || "") === (color || "") &&
                    (item.size || "") === (size || "")
            );

            if (itemIndex > -1) {
                const nextQuantity = cart.items[itemIndex].quantity + quantity;
                cart.items[itemIndex].quantity = Math.min(
                    nextQuantity,
                    product.stock
                );
            } else {
                cart.items.push({
                    product: product._id,
                    quantity: Math.min(quantity, product.stock),
                    color,
                    size,
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
        if (product && itemData.quantity > product.stock) {
            appAssert(false, BAD_REQUEST, "Quantity is more than the stock of this product");
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