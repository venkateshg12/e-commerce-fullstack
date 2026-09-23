import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";
import {
    getCartItems,
    createCartItem,
    syncCartItem,
    updateCartItem,
    deleteCartItem,
    clearCart,
} from "../controllers/cart.controller";

export const cartRouter = Router();

cartRouter.use("/cart", authenticate, protectedApiLimiter);

cartRouter.get("/cart", getCartItems);
cartRouter.post("/cart", createCartItem);
cartRouter.post("/cart/sync", syncCartItem);
cartRouter.patch("/cart", updateCartItem);
cartRouter.delete("/cart", deleteCartItem);
cartRouter.delete("/cart/clear", clearCart);