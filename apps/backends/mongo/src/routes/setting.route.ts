import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";
import requireAdmin from "../middleware/requireAdmin";
import { createBannersHandler, deleteBannerHandler, getBannersHandler } from "../controllers/setting.controller";
import { upload } from "../middleware/upload";

export const settingRouter = Router();

settingRouter.get("/settings/banners", authenticate, requireAdmin, protectedApiLimiter, getBannersHandler);
settingRouter.get("/admin/settings/banners", authenticate, requireAdmin, protectedApiLimiter, getBannersHandler);
settingRouter.post("/settings/banners", authenticate, requireAdmin, protectedApiLimiter, upload.array("images", 10), createBannersHandler);
settingRouter.post("/admin/settings/banners", authenticate, requireAdmin, protectedApiLimiter, upload.array("images", 10), createBannersHandler);
settingRouter.delete("/settings/banners/:id", authenticate, requireAdmin, protectedApiLimiter, deleteBannerHandler);