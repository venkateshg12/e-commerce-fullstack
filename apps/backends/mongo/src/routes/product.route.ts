import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin";
import authenticate from "../middleware/authenticate";
import { upload } from "../middleware/upload";
import {
    createProductCategoryHandler,
    createProductHandler,
    updateProductMetadataHandler,
    uploadProductImagesHandler,
    deleteProductImagesHandler,
    changeProductCoverHandler,
    deleteProductHandler,
    productCategoryHandler,
    searchProductByIdHandler,
    searchProductHandler,
    updateProductCategoryHandler,
} from "../controllers/product.controller";

export const productRoutes = Router();


productRoutes.post("/admin/products", authenticate, requireAdmin, createProductHandler);
productRoutes.post("/admin/products/:id/images", authenticate, requireAdmin, upload.array("images"), uploadProductImagesHandler);
productRoutes.delete("/admin/products/:id/images", authenticate, requireAdmin, deleteProductImagesHandler);
productRoutes.patch("/admin/products/:id/images/cover", authenticate, requireAdmin, changeProductCoverHandler);
productRoutes.patch("/admin/products/:id", authenticate, requireAdmin, updateProductMetadataHandler);
productRoutes.delete("/admin/products/:id", authenticate, requireAdmin, deleteProductHandler);

productRoutes.get("/admin/categories", authenticate, requireAdmin, productCategoryHandler);
productRoutes.post("/admin/categories", authenticate, requireAdmin, createProductCategoryHandler);
productRoutes.put("/admin/categories/:id", authenticate, requireAdmin, updateProductCategoryHandler);

// Public storefront catalog: browsable without an account. The handlers gate on
// `req.role !== "admin"` to force `status: "active"`, and an anonymous request has no role,
// so inactive products stay hidden.
productRoutes.get("/categories", productCategoryHandler);

productRoutes.get("/products", searchProductHandler);
productRoutes.get("/products/:id", searchProductByIdHandler);

export default productRoutes;