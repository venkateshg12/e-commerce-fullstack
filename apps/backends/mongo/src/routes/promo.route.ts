import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import { promoApplyLimiter } from "../config/rateLimiter";
import {
    getActivePromosHandler,
    getPromoHandler,
    createPromoHandler,
    updatePromoHandler,
    deletePromoHandler,
    applyPromoHandler,
} from "../controllers/promo.controller";

export const promoRouter = Router();

// Every promo, including ones not yet started or already exhausted — an admin listing. A signed-in
// customer reading this could discover unreleased codes, so it needs the same gate as the writes.
promoRouter.get("/promos", authenticate, requireAdmin, getPromoHandler);
// Customer-facing: only coupons usable right now (in their window, with uses left).
promoRouter.get("/promos/active", authenticate, getActivePromosHandler);

promoRouter.post("/promos", authenticate, requireAdmin, createPromoHandler);
promoRouter.post("/promos/apply", authenticate, promoApplyLimiter, applyPromoHandler);
promoRouter.patch("/promos/:id", authenticate, requireAdmin, updatePromoHandler);
promoRouter.delete("/promos/:id", authenticate, requireAdmin, deletePromoHandler);