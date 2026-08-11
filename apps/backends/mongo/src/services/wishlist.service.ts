import mongoose, { Types } from "mongoose";
import { WishlistModel } from "../models/wishlist.model";
import ProductModel from "../models/product.model";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { formatProduct } from "./cart.service";
import { ProductPreview } from "../types/cartItem.types";
import { SyncWishlistSchema, WishlistProductSchema } from "@repo/types";

export const getWishlistService = async (
    userId: string | Types.ObjectId
) => {
    const wishlist = await WishlistModel.findOne({
        user: userId,
    }).populate(
        "products",
        "title brand price salePercentage images"
    );

    const products = (wishlist?.products || []) as unknown as Array<
        ProductPreview | null
    >;

    const items = products.flatMap((productItem) => {
        if (!productItem) return [];

        return [formatProduct(productItem)];
    });

    return { items };
};

export const addToWishlistService = async (
    userId: string | Types.ObjectId,
    data: WishlistProductSchema
) => {
    appAssert(
        mongoose.isValidObjectId(data.productId),
        BAD_REQUEST,
        "Invalid product ID"
    );

    const product = await ProductModel.findOne({
        _id: data.productId,
        status: "active",
    });

    appAssert(product, NOT_FOUND, "Product not found");

    let wishlist = await WishlistModel.findOne({ user: userId });

    if (!wishlist) {
        wishlist = await WishlistModel.create({
            user: userId,
            products: [],
        });
    }

    const exists = wishlist.products.some(
        (id) => id.toString() === String(product._id)
    );

    if (!exists) {
        wishlist.products.push(product._id as any);
        await wishlist.save();
    }

    return getWishlistService(userId);
};

export const removeFromWishlistService = async (
    userId: string | Types.ObjectId,
    data: WishlistProductSchema
) => {
    const wishlist = await WishlistModel.findOne({ user: userId });
    appAssert(wishlist, NOT_FOUND, "Wishlist not found");

    wishlist.products = wishlist.products.filter(
        (id) => id.toString() !== data.productId
    ) as any;

    await wishlist.save();
    return getWishlistService(userId);
};

export const toggleWishlistService = async (
    userId: string | Types.ObjectId,
    data: WishlistProductSchema
) => {
    appAssert(
        mongoose.isValidObjectId(data.productId),
        BAD_REQUEST,
        "Invalid product ID"
    );

    let wishlist = await WishlistModel.findOne({ user: userId });

    if (!wishlist) {
        wishlist = await WishlistModel.create({
            user: userId,
            products: [],
        });
    }

    const index = wishlist.products.findIndex(
        (id) => id.toString() === data.productId
    );

    if (index > -1) {
        wishlist.products.splice(index, 1);
    } else {
        const product = await ProductModel.findOne({
            _id: data.productId,
            status: "active",
        });
        appAssert(product, NOT_FOUND, "Product not found");
        wishlist.products.push(product._id as any);
    }

    await wishlist.save();
    return getWishlistService(userId);
};

export const syncWishlistService = async (
    userId: string | Types.ObjectId,
    data: SyncWishlistSchema
) => {
    let wishlist = await WishlistModel.findOne({
        user: userId,
    });

    if (!wishlist) {
        wishlist = await WishlistModel.create({
            user: userId,
            products: [],
        });
    }

    const validProductIds = data.productIds.filter(
        (productId) => mongoose.isValidObjectId(productId)
    );

    const products = await ProductModel.find({
        _id: { $in: validProductIds },
        status: "active",
    });

    const existingProductIds = new Set(
        wishlist.products.map((id) => id.toString())
    );

    for (const product of products) {
        const productId = product._id.toString();

        if (!existingProductIds.has(productId)) {
            wishlist.products.push(product._id);
            existingProductIds.add(productId);
        }
    }

    await wishlist.save();

    return getWishlistService(userId);
};