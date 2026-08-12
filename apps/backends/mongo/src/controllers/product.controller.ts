import mongoose from "mongoose";
import { ACCEPTED, BAD_REQUEST, CONFLICT, CREATED, NOT_FOUND, OK } from "../constants/https";
import CategoryModel from "../models/category.model";
import ProductModel from "../models/product.model";
import { appAssert, catchError, ok } from "../utils";
import {
    categorySchema,
    createProductSchema,
    updateProductMetadataSchema,
    deleteProductImagesSchema,
    changeProductCoverSchema,
    productAppliedFilterListQuerySchema,
    type ProductSort,
} from "@repo/types";
import {
    createProductService,
    updateProductMetadataService,
    uploadProductImagesService,
    deleteProductImagesService,
    changeProductCoverService,
    deleteProductService,
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
        const product = await uploadProductImagesService(productId, files);
        return res.status(ACCEPTED).json(ok(product));
    }
);

// Deletes single or multiple images from Cloudinary & Mongo. Ensures 1+ images remain and auto-reassigns cover image if deleted.

export const deleteProductImagesHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        const payload = deleteProductImagesSchema.parse(req.body);
        const product = await deleteProductImagesService(productId, payload);
        return res.status(OK).json(ok(product));
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
        return res.status(OK).json(ok(result));
    }
);

export const productCategoryHandler = catchError(
    async (req, res) => {
        const categories = await CategoryModel.find({}).sort({
            name: 1,
        });
        res.json(ok(categories));
    }
);

export const createProductCategoryHandler = catchError(
    async (req, res) => {
        const { name } = categorySchema.parse(req.body);

        const existing = await CategoryModel.findOne({ name });
        appAssert(!existing, CONFLICT, "Category name already exists");

        const category = await CategoryModel.create({ name });
        res.status(CREATED).json(ok(category));
    }
);

export const updateProductCategoryHandler = catchError(
    async (req, res) => {
        const categoryId = req.params.id as string;
        appAssert(mongoose.isValidObjectId(categoryId), BAD_REQUEST, "Invalid category ID");

        const { name } = categorySchema.parse(req.body);

        const existingCategory = await CategoryModel.findById(categoryId);
        appAssert(existingCategory, NOT_FOUND, "Category not found");

        const duplicate = await CategoryModel.findOne({ name, _id: { $ne: categoryId } });
        appAssert(!duplicate, CONFLICT, "Category name already exists");

        existingCategory.name = name;

        await existingCategory.save();
        res.status(OK).json(ok(existingCategory));
    }
);


export const searchProductHandler = catchError(
    async (req, res) => {
        const { search, category, brand, color, size, sort } = productAppliedFilterListQuerySchema.parse(req.query);

        const query: Record<string, unknown> = {};

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.title = { $regex: escapedSearch, $options: "i" };
        }
        if (category) {
            query.category = category;
        }
        if (brand) {
            query.brand = brand;
        }
        if (color) {
            query.colors = color;
        }
        if (size) {
            query.sizes = size;
        }

        // If not an admin, only allow viewing active products
        if (req.role !== "admin") {
            query.status = "active";
        }

        let sortOption: Record<string, 1 | -1> = { createdAt: -1 };

        if (sort === "price-low") {
            sortOption = { price: 1 };
        } else if (sort === "price-high") {
            sortOption = { price: -1 };
        }



        const products = await ProductModel.find(query)
            .populate("category", "name")
            .sort(sortOption);

        return res.status(OK).json(ok(products));
    }
);


export const searchProductByIdHandler = catchError(
    async (req, res) => {
        const productId = req.params.id as string;
        appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, "Invalid product ID");

        const query: Record<string, unknown> = { _id: productId };

        // If not an admin, only allow viewing active products
        if (req.role !== "admin") {
            query.status = "active";
        }

        const product = await ProductModel.findOne(query).populate("category", "name");
        appAssert(product, NOT_FOUND, "Product not found");

        return res.status(OK).json(ok(product));
    }
);

export const getCategoryHanlder = catchError(
    async (req, res) => {
        const categories = await CategoryModel.find({}).sort({ name: 1 });
        res.status(OK).json(ok(categories));
    }
);
