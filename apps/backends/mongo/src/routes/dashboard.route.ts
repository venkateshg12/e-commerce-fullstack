import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";
import requireAdmin from "../middleware/requireAdmin";
import { getDashboardHandler, getDashboardLiteHandler } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/lite", authenticate, requireAdmin, protectedApiLimiter, getDashboardLiteHandler);
dashboardRouter.get("/admin/dashboard", authenticate, requireAdmin, protectedApiLimiter, getDashboardHandler);