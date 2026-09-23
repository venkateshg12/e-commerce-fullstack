import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";
import {
    getWishlistHandler,
    addToWishlistHandler,
    removeFromWishlistHandler,
    toggleWishlistHandler,
    syncWishlistHandler,
} from "../controllers/wishlist.controller";

export const wishlistRouter = Router();

wishlistRouter.use("/wishlist", authenticate, protectedApiLimiter);

wishlistRouter.get("/wishlist", getWishlistHandler);
wishlistRouter.post("/wishlist", addToWishlistHandler);
wishlistRouter.post("/wishlist/toggle", toggleWishlistHandler);
wishlistRouter.post("/wishlist/sync", syncWishlistHandler);
wishlistRouter.delete("/wishlist", removeFromWishlistHandler);