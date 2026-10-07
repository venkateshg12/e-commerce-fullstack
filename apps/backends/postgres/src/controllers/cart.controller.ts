import { OK } from "../constants/http";
import { addItemToCartService, clearCartService, deleteCartItemService, getCartItemService, syncCartItemService, updateCartItemService } from "../services/cart.service";
import { ok } from "../utils/api/apiEnvelope";
import { catchError } from "../utils/errors/catchError";
import { addToCartSchema, syncCartSchema, updateCartItemSchema, deleteCartItemSchema } from "@repo/types";


export const getCartItems = catchError(
    async (req, res) => {
        const cartData = await getCartItemService(req.userId!);
        return res.status(OK).json(ok(cartData));
    }
);

export const createCartItem = catchError(
    async (req, res) => {
        const data = addToCartSchema .parse(req.body);
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