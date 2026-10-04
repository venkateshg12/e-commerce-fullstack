import { Router } from "express";
import authenticate from "../middleware/authenticate";
import requireAdmin from "../middleware/requireAdmin";
import { changeProductCoverHandler, createProductHandler, deleteProductImagesHandler, setProductImageColorHandler, updateProductMetadataHandler, uploadProductImagesHandler, deleteProductHandler, productCategoryHandler, createProductCategoryHandler, updateProductCategoryHandler, getProductFacetsHandler, searchProductHandler, searchProductByIdHandler } from "../controllers/product.controller";
import { upload } from "../middleware/upload";


export const productRoutes = Router();

productRoutes.post("/admin/products", authenticate, requireAdmin,createProductHandler);
productRoutes.post("/admin/products/:id/images", authenticate, requireAdmin, upload.array("images"), uploadProductImagesHandler);
productRoutes.delete("/admin/products/:id/images", authenticate, requireAdmin, deleteProductImagesHandler);
productRoutes.patch("/admin/products/:id/images/cover", authenticate, requireAdmin, changeProductCoverHandler);
productRoutes.patch("/admin/products/:id/images/color", authenticate, requireAdmin,  setProductImageColorHandler);
productRoutes.patch("/admin/products/:id", authenticate, requireAdmin,  updateProductMetadataHandler);
productRoutes.delete("/admin/products/:id", authenticate, requireAdmin,  deleteProductHandler);


productRoutes.get("/admin/categories", authenticate, requireAdmin,  productCategoryHandler);
productRoutes.post("/admin/categories", authenticate, requireAdmin,  createProductCategoryHandler);
productRoutes.put("/admin/categories/:id", authenticate, requireAdmin, updateProductCategoryHandler);


productRoutes.get("/categories", productCategoryHandler);


productRoutes.get("/products/facets", getProductFacetsHandler);
productRoutes.get("/products",  searchProductHandler);
productRoutes.get("/products/:id",  searchProductByIdHandler);



