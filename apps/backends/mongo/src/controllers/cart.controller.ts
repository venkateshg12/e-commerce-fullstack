import { OK } from "../constants/https";
import { catchError, ok } from "../utils";
import {
    addToCartSchema,
    updateCartItemSchema,
    deleteCartItemSchema,
    syncCartSchema,
} from "@repo/types";
import {
    getCartItemService,
    addItemToCartService,
    syncCartItemService,
    updateCartItemService,
    deleteCartItemService,
    clearCartService,
} from "../services/cart.service";

export const getCartItems = catchError(
    async (req, res) => {
        const cartData = await getCartItemService(req.userId!);
        return res.status(OK).json(ok(cartData));
    }
);

export const createCartItem = catchError(
    async (req, res) => {
        const data = addToCartSchema.parse(req.body);
        const cartData = await addItemToCartService(req.userId!, data);
        return res.status(OK).json(ok(cartData));
    }
);

export const syncCartItem = catchError(
    async (req, res) => {
        const data = syncCartSchema.parse(req.body);
        const cartData = await syncCartItemService(req.userId!, data);
        return res.status(OK).json(ok(cartData));
    }
);

export const updateCartItem = catchError(
    async (req, res) => {
        const data = updateCartItemSchema.parse(req.body);
        const cartData = await updateCartItemService(req.userId!, data);
        return res.status(OK).json(ok(cartData));
    }
);

export const deleteCartItem = catchError(
    async (req, res) => {
        const data = deleteCartItemSchema.parse(req.body);
        const cartData = await deleteCartItemService(req.userId!, data);
        return res.status(OK).json(ok(cartData));
    }
);

export const clearCart = catchError(
    async (req, res) => {
        const cartData = await clearCartService(req.userId!);
        return res.status(OK).json(ok(cartData));
    }
);