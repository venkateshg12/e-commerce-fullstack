import { ACCEPTED, CREATED, OK } from "../constants/http";
import { ok } from "../utils/api/apiEnvelope";
import { catchError } from "../utils/errors/catchError";
import { categorySchema, changeProductCoverSchema, createProductSchema, deleteProductImagesSchema, productAppliedFilterListQuerySchema, setImageColorSchema, updateProductMetadataSchema, uploadImageColorsSchema } from "@repo/types";
import { changeProductCoverService, createProductService, deleteProductImagesService, setProductImageColorService, updateProductMetadataService, uploadProductImagesService, deleteProductService, listProductsService, getProductByIdService } from "../services/product.service";
import { createCategoryService, getCategoriesWithSubCategoriesService, getProductFacetsService, updateCategoryService } from "../services/catalog.service";
import z from "zod";

/*
  The shared filter schema checks category/brand/type ids as 24-character Mongo ObjectIds, so a
  Postgres uuid would be a 400 before reaching the service. Same schema, uuid ids. An empty string
  still means "no filter", as the storefront sends a cleared facet that way.
 */
const optionalUuid = (label: string) =>
    z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.string().uuid({ message: `Invalid ${label} ID` }).optional()
    );

const productListQuerySchema = productAppliedFilterListQuerySchema.extend({
    category: optionalUuid("category"),
    brand: optionalUuid("brand"),
    subCategory: optionalUuid("type"),
});

export const createProductHandler = catchError(
    async (req, res) => {
        const data = createProductSchema.parse(req.body);
        const product = await createProductService(req.userId, data);
        return res.status(CREATED).json(ok(product));
    }
)

export const uploadProductImagesHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const files = (req.files as Express.Multer.File[]) || [];
        const { imageColors, position } = uploadImageColorsSchema.parse(req.body);
        const product = await uploadProductImagesService(productId, files, imageColors, position);
        return res.status(ACCEPTED).json(ok(product));
    }
)

export const deleteProductImagesHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = deleteProductImagesSchema.parse(req.body);
        const product = await deleteProductImagesService(productId, payload);
        return res.status(ACCEPTED).json(ok(product));
    }
)


export const changeProductCoverHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = changeProductCoverSchema.parse(req.body);
        const product = await changeProductCoverService(productId, payload);
        return res.status(OK).json(ok(product));
    }
)


export const setProductImageColorHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = setImageColorSchema.parse(req.body);
        const product = await setProductImageColorService(productId, payload);
        return res.status(OK).json(ok(product));
    }
)

export const updateProductMetadataHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const data = updateProductMetadataSchema.parse(req.body);
        const product = await updateProductMetadataService(productId, data);
        return res.status(OK).json(ok(product));
    }
)

export const deleteProductHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const result = await deleteProductService(productId);
        return res.status(ACCEPTED).json(ok(result));
    }
)


export const productCategoryHandler = catchError(
    async (req, res) => {
        const categories = await getCategoriesWithSubCategoriesService();
        res.json(ok(categories));
    }
)


export const createProductCategoryHandler = catchError(
    async (req, res) => {
        const data = categorySchema.parse(req.body);
        const category = await createCategoryService(data);
        return res.status(CREATED).json(ok(category));
    }
)

export const updateProductCategoryHandler = catchError(
    async (req, res) => {
        const data = categorySchema.parse(req.body);
        const category = await updateCategoryService(req.params.id as string, data);
        return res.status(OK).json(ok(category));
    }
)


export const getProductFacetsHandler = catchError(
    async (req, res) => {
        const facets = await getProductFacetsService();
        return res.status(OK).json(ok(facets));
    }
)


export const searchProductHandler = catchError(
    async(req, res) => {
        const filters = productListQuerySchema.parse(req.query);
        // Only an admin may see products that aren't active.
        const { items, ...meta } = await listProductsService(filters, {
            includeInactive: req.role === "admin",
        });

        return res.status(OK).json(ok(items, meta))
    }
)



export const searchProductByIdHandler = catchError(
    async (req, res) => {
        const product = await getProductByIdService(req.params.id as string, {
            includeInactive: req.role === "admin",
        });

        return res.status(OK).json(ok(product));
    }
);
