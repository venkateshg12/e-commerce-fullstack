import { CREATED, OK } from "../constants/https";
import { catchError, ok } from "../utils";
import { applyPromoSchema, createPromoSchema, updatePromoSchema } from "@repo/types";
import {
    getActivePromosService,
    getPromoService,
    createPromoService,
    updatePromoService,
    deletePromoService,
    applyPromoService,
} from "../services/promo.services";

export const getActivePromosHandler = catchError(
    async (req, res) => {
        const promos = await getActivePromosService();
        return res.status(OK).json(ok({ items: promos }));
    }
);

export const getPromoHandler = catchError(
    async (req, res) => {
        const promos = await getPromoService();
        return res.status(OK).json(ok({ items: promos }));
    }
);

export const createPromoHandler = catchError(
    async (req, res) => {
        const data = createPromoSchema.parse(req.body);
        const promos = await createPromoService(data);
        return res.status(CREATED).json(ok({ items: promos }));
    }
);

export const applyPromoHandler = catchError(
    async (req, res) => {
        const { code } = applyPromoSchema.parse(req.body);
        const promo = await applyPromoService(code);
        return res.status(OK).json(ok({ item: promo }));
    }
);

export const updatePromoHandler = catchError(
    async (req, res) => {
        const promoId = req.params.id as string;
        const data = updatePromoSchema.parse(req.body);
        const promo = await updatePromoService(promoId, data);
        return res.status(OK).json(ok({ item: promo }));
    }
);

export const deletePromoHandler = catchError(
    async (req, res) => {
        const promoId = req.params.id as string;
        const { message } = await deletePromoService(promoId);
        return res.status(OK).json(ok({ message: message }));
    }
);