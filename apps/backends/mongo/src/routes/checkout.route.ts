import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { checkoutLimiter, protectedApiLimiter } from "../config/rateLimiter";
import {
    confirmCheckoutHandler,
    createCheckoutHandler,
    getUserPointsHandler,
    payWithPointsHandler,
    resumeCheckoutHandler,
} from "../controllers/checkout.controller";

export const checkoutRouter = Router();

checkoutRouter.post("/checkout/create-session", authenticate, checkoutLimiter, createCheckoutHandler);
checkoutRouter.post("/checkout/resume-session", authenticate, checkoutLimiter, resumeCheckoutHandler);
checkoutRouter.post("/checkout/confirm", authenticate, checkoutLimiter, confirmCheckoutHandler);
checkoutRouter.get("/checkout/points", authenticate, protectedApiLimiter, getUserPointsHandler);
checkoutRouter.post("/checkout/pay-with-points", authenticate, checkoutLimiter, payWithPointsHandler);