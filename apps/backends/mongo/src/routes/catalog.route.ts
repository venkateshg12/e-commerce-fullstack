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

import { publicCatalogLimiter } from "../config/rateLimiter";

export const catalogRoutes = Router();

// Public: the storefront brand filter reads this.
catalogRoutes.get("/brands", publicCatalogLimiter, getBrandsHandler);

catalogRoutes.post("/admin/brands", authenticate, requireAdmin, createBrandHandler);
catalogRoutes.put("/admin/brands/:id", authenticate, requireAdmin, updateBrandHandler);
catalogRoutes.delete("/admin/brands/:id", authenticate, requireAdmin, deleteBrandHandler);

catalogRoutes.delete("/admin/categories/:id", authenticate, requireAdmin, deleteCategoryHandler);

catalogRoutes.post("/admin/sub-categories", authenticate, requireAdmin, createSubCategoryHandler);
catalogRoutes.put("/admin/sub-categories/:id", authenticate, requireAdmin, updateSubCategoryHandler);
catalogRoutes.delete("/admin/sub-categories/:id", authenticate, requireAdmin, deleteSubCategoryHandler);

export default catalogRoutes;
