import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import {
    getAllOrdersHandler,
    getOrdersHandler,
    returnOrderHandler,
    updateOrderStatusHandler,
} from "../controllers/order.controller";

export const orderRouter = Router();

orderRouter.get("/orders", authenticate, getOrdersHandler);
orderRouter.patch("/orders/:orderId/return", authenticate, returnOrderHandler);

orderRouter.get("/admin/orders", authenticate, requireAdmin, getAllOrdersHandler);
orderRouter.patch("/orders/:orderId/status", authenticate, requireAdmin, updateOrderStatusHandler);