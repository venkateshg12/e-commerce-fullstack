import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import { protectedApiLimiter } from "../config/rateLimiter";
import {
    cancelOrderHandler,
    getAllOrdersHandler,
    getOrdersHandler,
    returnOrderHandler,
    updateOrderStatusHandler,
} from "../controllers/order.controller";

export const orderRouter = Router();

orderRouter.get("/orders", authenticate, protectedApiLimiter, getOrdersHandler);
orderRouter.patch("/orders/:orderId/return", authenticate, protectedApiLimiter, returnOrderHandler);
orderRouter.patch("/orders/:orderId/cancel", authenticate, protectedApiLimiter, cancelOrderHandler);

orderRouter.get("/admin/orders", authenticate, requireAdmin, protectedApiLimiter, getAllOrdersHandler);
orderRouter.patch("/orders/:orderId/status", authenticate, requireAdmin, protectedApiLimiter, updateOrderStatusHandler);