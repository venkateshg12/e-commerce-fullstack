import { OK } from "../constants/https";
import { catchError, ok } from "../utils";
import {
    wishlistProductSchema,
    syncWishlistSchema,
} from "@repo/types";
import {
    getWishlistService,
    addToWishlistService,
    removeFromWishlistService,
    toggleWishlistService,
    syncWishlistService,
} from "../services/wishlist.service";

export const getWishlistHandler = catchError(
    async (req, res) => {
        const wishlistData = await getWishlistService(req.userId!);
        return res.status(OK).json(ok(wishlistData));
    }
);

export const addToWishlistHandler = catchError(
    async (req, res) => {
        const data = wishlistProductSchema.parse(req.body);
        const wishlistData = await addToWishlistService(req.userId!, data);
        return res.status(OK).json(ok(wishlistData));
    }
);

export const removeFromWishlistHandler = catchError(
    async (req, res) => {
        const data = wishlistProductSchema.parse(req.body);
        const wishlistData = await removeFromWishlistService(req.userId!, data);
        return res.status(OK).json(ok(wishlistData));
    }
);

export const toggleWishlistHandler = catchError(
    async (req, res) => {
        const data = wishlistProductSchema.parse(req.body);
        const wishlistData = await toggleWishlistService(req.userId!, data);
        return res.status(OK).json(ok(wishlistData));
    }
);

export const syncWishlistHandler = catchError(
    async (req, res) => {
        const data = syncWishlistSchema.parse(req.body);
        const wishlistData = await syncWishlistService(req.userId!, data);
        return res.status(OK).json(ok(wishlistData));
    }
);