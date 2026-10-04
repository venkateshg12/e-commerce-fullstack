import { Router } from "express";
import { createBrandHandler, deleteBrandHandler, deleteCategoryHandler, getBrandsHandler, updateBrandHandler, createSubCategoryHandler } from "../controllers/catalog.controller";
import requireAdmin from "../middleware/requireAdmin";
import authenticate from "../middleware/authenticate";




export const catalogRoutes = Router();

catalogRoutes.get("/brands", getBrandsHandler);

catalogRoutes.post("/admin/brands", authenticate, requireAdmin, createBrandHandler);
catalogRoutes.put("/admin/brands/:id", authenticate, requireAdmin,  updateBrandHandler);
catalogRoutes.delete("/admin/brands/:id", authenticate, requireAdmin,  deleteBrandHandler);

catalogRoutes.delete("/admin/categories/:id", authenticate, requireAdmin, deleteCategoryHandler);

catalogRoutes.post("/admin/sub-categories", authenticate, requireAdmin,  createSubCategoryHandler);





