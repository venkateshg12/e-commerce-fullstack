import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin";
import authenticate from "../middleware/authenticate";
import {
    createBrandHandler,
    createSubCategoryHandler,
    deleteBrandHandler,
    deleteCategoryHandler,
    deleteSubCategoryHandler,
    getBrandsHandler,
    updateBrandHandler,
    updateSubCategoryHandler,
} from "../controllers/catalog.controller";

import { publicCatalogLimiter, protectedApiLimiter } from "../config/rateLimiter";

export const catalogRoutes = Router();

// Public: the storefront brand filter reads this.
catalogRoutes.get("/brands", publicCatalogLimiter, getBrandsHandler);

catalogRoutes.post("/admin/brands", authenticate, requireAdmin, protectedApiLimiter, createBrandHandler);
catalogRoutes.put("/admin/brands/:id", authenticate, requireAdmin, protectedApiLimiter, updateBrandHandler);
catalogRoutes.delete("/admin/brands/:id", authenticate, requireAdmin, protectedApiLimiter, deleteBrandHandler);

catalogRoutes.delete("/admin/categories/:id", authenticate, requireAdmin, protectedApiLimiter, deleteCategoryHandler);

catalogRoutes.post("/admin/sub-categories", authenticate, requireAdmin, protectedApiLimiter, createSubCategoryHandler);
catalogRoutes.put("/admin/sub-categories/:id", authenticate, requireAdmin, protectedApiLimiter, updateSubCategoryHandler);
catalogRoutes.delete("/admin/sub-categories/:id", authenticate, requireAdmin, protectedApiLimiter, deleteSubCategoryHandler);

export default catalogRoutes;
