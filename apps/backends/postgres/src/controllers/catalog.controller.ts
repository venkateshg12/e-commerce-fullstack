import { CREATED, OK } from "../constants/http";
import { ok } from "../utils/api/apiEnvelope";
import { catchError } from "../utils/errors/catchError";
import { createBrandService, deleteBrandService, deleteCategoryService, getBrandsService, updateBrandService, createSubCategoryService, updateSubCategoryService, deleteSubCategoryService } from "../services/catalog.service";
import { brandSchema, subCategorySchema, updateSubCategorySchema } from "@repo/types";


export const getBrandsHandler = catchError(
    async (req, res) => {
        const brands = await getBrandsService();
        return res.status(OK).json(ok(brands));
    }
);


export const createBrandHandler = catchError(
    async (req, res) => {
        const data = brandSchema.parse(req.body);
        const brand = await createBrandService(data);
        return res.status(CREATED).json(ok(brand));
    }
);


export const updateBrandHandler = catchError(
    async (req, res) => {
        const data = brandSchema.parse(req.body);
        const brand = await updateBrandService(req.params.id as string, data);
        return res.status(OK).json(ok(brand));
    }
);



export const deleteBrandHandler = catchError(
    async (req, res) => {
        const result = await deleteBrandService(req.params.id as string);
        return res.status(OK).json(ok(result));
    }
);



export const deleteCategoryHandler = catchError(
    async (req, res) => {
        const result = await deleteCategoryService(req.params.id as string);
        return res.status(OK).json(ok(result));
    }
);


export const createSubCategoryHandler = catchError(
    async (req, res) => {
        const data = subCategorySchema.parse(req.body);
        const subCategory = await createSubCategoryService(data);
        return res.status(CREATED).json(ok(subCategory));
    }
);

export const updateSubCategoryHandler = catchError(
    async (req, res) => {
        const data = updateSubCategorySchema.parse(req.body);
        const subCategory = await updateSubCategoryService(req.params.id as string, data);
        return res.status(OK).json(ok(subCategory));
    }
);


export const deleteSubCategoryHandler = catchError(
    async (req, res) => {
        const result = await deleteSubCategoryService(req.params.id as string);
        return res.status(OK).json(ok(result));
    }
);
