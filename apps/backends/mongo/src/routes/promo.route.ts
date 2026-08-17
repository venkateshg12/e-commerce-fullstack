import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import {
    getPromoHandler,
    createPromoHandler,
    updatePromoHandler,
    deletePromoHandler,
    applyPromoHandler,
} from "../controllers/promo.controller";

export const promoRouter = Router();

promoRouter.get("/promos", authenticate, getPromoHandler);

promoRouter.post("/promos", authenticate, requireAdmin, createPromoHandler);
promoRouter.post("/promos/apply", authenticate, applyPromoHandler);
promoRouter.patch("/promos/:id", authenticate, requireAdmin, updatePromoHandler);
promoRouter.delete("/promos/:id", authenticate, requireAdmin, deletePromoHandler);