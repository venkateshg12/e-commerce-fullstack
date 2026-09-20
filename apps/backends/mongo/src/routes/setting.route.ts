import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import { createBannersHandler, getBannersHandler } from "../controllers/setting.controller";
import { upload } from "../middleware/upload";

export const settingRouter = Router();

settingRouter.get("/settings/banners", authenticate, requireAdmin, getBannersHandler);
settingRouter.get("/admin/settings/banners", authenticate, requireAdmin, getBannersHandler);
settingRouter.post("/settings/banners", authenticate, requireAdmin, upload.array("images", 10), createBannersHandler);
settingRouter.post("/admin/settings/banners", authenticate, requireAdmin, upload.array("images", 10), createBannersHandler);