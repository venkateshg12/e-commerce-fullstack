import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin";
import authenticate from "../middleware/authenticate";
import { upload } from "../middleware/upload";
import { publicCatalogLimiter, protectedApiLimiter } from "../config/rateLimiter";
import {
    createProductCategoryHandler,
    createProductHandler,
    updateProductMetadataHandler,
    uploadProductImagesHandler,
    deleteProductImagesHandler,
    changeProductCoverHandler,
    deleteProductHandler,
    getProductFacetsHandler,
    setProductImageColorHandler,
    productCategoryHandler,
    searchProductByIdHandler,
    searchProductHandler,
    updateProductCategoryHandler,
} from "../controllers/product.controller";

export const productRoutes = Router();


productRoutes.post("/admin/products", authenticate, requireAdmin, protectedApiLimiter, createProductHandler);
productRoutes.post("/admin/products/:id/images", authenticate, requireAdmin, protectedApiLimiter, upload.array("images"), uploadProductImagesHandler);
productRoutes.delete("/admin/products/:id/images", authenticate, requireAdmin, protectedApiLimiter, deleteProductImagesHandler);
productRoutes.patch("/admin/products/:id/images/cover", authenticate, requireAdmin, protectedApiLimiter, changeProductCoverHandler);
productRoutes.patch("/admin/products/:id/images/color", authenticate, requireAdmin, protectedApiLimiter, setProductImageColorHandler);
productRoutes.patch("/admin/products/:id", authenticate, requireAdmin, protectedApiLimiter, updateProductMetadataHandler);
productRoutes.delete("/admin/products/:id", authenticate, requireAdmin, protectedApiLimiter, deleteProductHandler);

productRoutes.get("/admin/categories", authenticate, requireAdmin, protectedApiLimiter, productCategoryHandler);
productRoutes.post("/admin/categories", authenticate, requireAdmin, protectedApiLimiter, createProductCategoryHandler);
productRoutes.put("/admin/categories/:id", authenticate, requireAdmin, protectedApiLimiter, updateProductCategoryHandler);

// Public storefront catalog: browsable without an account. The handlers gate on
// `req.role !== "admin"` to force `status: "active"`, and an anonymous request has no role,
// so inactive products stay hidden.
productRoutes.get("/categories", publicCatalogLimiter, productCategoryHandler);

// Must come before "/products/:id" — Express matches route order, and ":id" would otherwise
// swallow this as id="facets".
productRoutes.get("/products/facets", publicCatalogLimiter, getProductFacetsHandler);
productRoutes.get("/products", publicCatalogLimiter, searchProductHandler);
productRoutes.get("/products/:id", publicCatalogLimiter, searchProductByIdHandler);

export default productRoutes;