import { ACCEPTED, CREATED, OK } from "../constants/https";
import {
    createCategoryService,
    getCategoriesWithSubCategoriesService,
    updateCategoryService,
} from "../services/catalog.service";
import { catchError, ok } from "../utils";
import {
    categorySchema,
    createProductSchema,
    updateProductMetadataSchema,
    deleteProductImagesSchema,
    changeProductCoverSchema,
    productAppliedFilterListQuerySchema,
    setImageColorSchema,
    uploadImageColorsSchema,
} from "@repo/types";
import {
    createProductService,
    updateProductMetadataService,
    uploadProductImagesService,
    deleteProductImagesService,
    changeProductCoverService,
    setProductImageColorService,
    deleteProductService,
    getProductByIdService,
    getProductFacetsService,
    listProductsService,
} from "../services/product.service";



export const createProductHandler = catchError(
    async (req, res) => {
        const data = createProductSchema.parse(req.body);
        const product = await createProductService(req.userId!, data);
        return res.status(CREATED).json(ok(product));
    }
);


export const updateProductMetadataHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const data = updateProductMetadataSchema.parse(req.body);
        const product = await updateProductMetadataService(productId, data);
        return res.status(OK).json(ok(product));
    }
);


//Appends new uploaded images to product via BullMQ worker. Returns 202 Accepted.

export const uploadProductImagesHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const files = (req.files as Express.Multer.File[]) || [];
        // Multipart text parts land on req.body; one `imageColors` part per file part, in order.
        const { imageColors, position } = uploadImageColorsSchema.parse(req.body);
        const product = await uploadProductImagesService(productId, files, imageColors, position);
        return res.status(ACCEPTED).json(ok(product));
    }
);

// Sets which colour a single already-uploaded image depicts. The colour must already be in the
// product's own `colors` palette — see setProductImageColorService.

export const setProductImageColorHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = setImageColorSchema.parse(req.body);
        const product = await setProductImageColorService(productId, payload);
        return res.status(OK).json(ok(product));
    }
);

// Deletes single or multiple images from Cloudinary & Mongo. Ensures 1+ images remain and auto-reassigns cover image if deleted.

export const deleteProductImagesHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = deleteProductImagesSchema.parse(req.body);
        const product = await deleteProductImagesService(productId, payload);
        return res.status(ACCEPTED).json(ok(product));
    }
);


//Sets exactly one image as cover. No uploads or deletes.

export const changeProductCoverHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = changeProductCoverSchema.parse(req.body);
        const product = await changeProductCoverService(productId, payload);
        return res.status(OK).json(ok(product));
    }
);


export const deleteProductHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const result = await deleteProductService(productId);
        return res.status(ACCEPTED).json(ok(result));
    }
);

export const productCategoryHandler = catchError(
    async (req, res) => {
        const categories = await getCategoriesWithSubCategoriesService();
        res.json(ok(categories));
    }
);

export const createProductCategoryHandler = catchError(
    async (req, res) => {
        const data = categorySchema.parse(req.body);
        const category = await createCategoryService(data);
        return res.status(CREATED).json(ok(category));
    }
);

export const updateProductCategoryHandler = catchError(
    async (req, res) => {
        const data = categorySchema.parse(req.body);
        const category = await updateCategoryService(req.params.id as string, data);
        return res.status(OK).json(ok(category));
    }
);


export const getProductFacetsHandler = catchError(
    async (req, res) => {
        const facets = await getProductFacetsService();
        return res.status(OK).json(ok(facets));
    }
);

export const searchProductHandler = catchError(
    async (req, res) => {
        const filters = productAppliedFilterListQuerySchema.parse(req.query);
        // Only an admin may see products that aren't active.
        const { items, ...meta } = await listProductsService(filters, {
            includeInactive: req.role === "admin",
        });

        return res.status(OK).json(ok(items, meta));
    }
);


export const searchProductByIdHandler = catchError(
    async (req, res) => {
        const product = await getProductByIdService(req.params.id as string, {
            includeInactive: req.role === "admin",
        });

        return res.status(OK).json(ok(product));
    }
);
