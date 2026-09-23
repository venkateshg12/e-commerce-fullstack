import mongoose from "mongoose";
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from "../constants/https";
import BrandModel from "../models/brand.model";
import CategoryModel from "../models/category.model";
import ProductModel from "../models/product.model";
import SubCategoryModel from "../models/subCategory.model";
import { appAssert } from "../utils/errors";
import { cache } from "../utils/cache";
import { invalidateProductDetailsWhere } from "./product.service";
import { BrandSchema, CategorySchema, SubCategorySchema, UpdateSubCategorySchema } from "@repo/types";

const CASE_INSENSITIVE = { locale: "en", strength: 2 };

// Changes only through the admin writes below, each of which bumps the version.
const CATALOG_TTL_SECONDS = 60 * 60;

const isDuplicateKeyError = (error: unknown) =>
    typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

// The unique indexes are the real guard; the findOne checks only give a friendlier message.
// This maps the index error from a race between two admins to the same 409.
const withDuplicateGuard = async <T>(message: string, run: () => Promise<T>) => {
    try {
        return await run();
    } catch (error) {
        appAssert(!isDuplicateKeyError(error), CONFLICT, message);
        throw error;
    }
};

const assertUnused = async (field: "brand" | "category" | "subCategory", id: string) => {
    const count = await ProductModel.countDocuments({ [field]: id });
    appAssert(
        count === 0,
        CONFLICT,
        `Used by ${count} product${count === 1 ? "" : "s"} — reassign them first`
    );
};

export const getBrandsService = async () =>
    cache.getOrSet(
        await cache.versionedKey(["catalog"], "brands"),
        () => BrandModel.find({}).collation(CASE_INSENSITIVE).sort({ name: 1 }).lean(),
        CATALOG_TTL_SECONDS
    );

export const createBrandService = async ({ name }: BrandSchema) => {
    const existing = await BrandModel.findOne({ name }).collation(CASE_INSENSITIVE);
    appAssert(!existing, CONFLICT, "Brand name already exists");

    const created = await withDuplicateGuard("Brand name already exists", () => BrandModel.create({ name }));
    await cache.bump("catalog");
    return created;
};

export const updateBrandService = async (brandId: string, { name }: BrandSchema) => {
    appAssert(mongoose.isValidObjectId(brandId), BAD_REQUEST, "Invalid brand ID");

    const brand = await BrandModel.findById(brandId);
    appAssert(brand, NOT_FOUND, "Brand not found");

    const duplicate = await BrandModel.findOne({ name, _id: { $ne: brandId } }).collation(CASE_INSENSITIVE);
    appAssert(!duplicate, CONFLICT, "Brand name already exists");

    brand.name = name;
    const saved = await withDuplicateGuard("Brand name already exists", () => brand.save());
    // Products embed their brand's name, so the cached page of every product of THIS brand is
    // stale — the rest of the catalogue's pages are untouched.
    await invalidateProductDetailsWhere({ brand: brandId });
    await cache.bump("catalog", "products");
    return saved;
};

export const deleteBrandService = async (brandId: string) => {
    appAssert(mongoose.isValidObjectId(brandId), BAD_REQUEST, "Invalid brand ID");

    const brand = await BrandModel.findById(brandId);
    appAssert(brand, NOT_FOUND, "Brand not found");

    await assertUnused("brand", brandId);
    await brand.deleteOne();
    await cache.bump("catalog");
    return { _id: brandId };
};

// Every category with its sub-categories embedded, both sorted by name.
export const getCategoriesWithSubCategoriesService = async () =>
    cache.getOrSet(
        await cache.versionedKey(["catalog"], "tree"),
        loadCategoryTree,
        CATALOG_TTL_SECONDS
    );

const loadCategoryTree = () =>
    CategoryModel.aggregate([
        { $sort: { name: 1 } },
        {
            $lookup: {
                from: SubCategoryModel.collection.name,
                let: { categoryId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$category", "$$categoryId"] } } },
                    { $sort: { name: 1 } },
                    { $project: { name: 1 } },
                ],
                as: "subCategories",
            },
        },
    ]).collation(CASE_INSENSITIVE);

export const createCategoryService = async ({ name }: CategorySchema) => {
    const existing = await CategoryModel.findOne({ name }).collation(CASE_INSENSITIVE);
    appAssert(!existing, CONFLICT, "Category name already exists");

    const created = await withDuplicateGuard("Category name already exists", () =>
        CategoryModel.create({ name })
    );
    await cache.bump("catalog");
    return created;
};

export const updateCategoryService = async (categoryId: string, { name }: CategorySchema) => {
    appAssert(mongoose.isValidObjectId(categoryId), BAD_REQUEST, "Invalid category ID");

    const category = await CategoryModel.findById(categoryId);
    appAssert(category, NOT_FOUND, "Category not found");

    const duplicate = await CategoryModel.findOne({ name, _id: { $ne: categoryId } }).collation(CASE_INSENSITIVE);
    appAssert(!duplicate, CONFLICT, "Category name already exists");

    category.name = name;
    const saved = await withDuplicateGuard("Category name already exists", () => category.save());

    // Products embed their category's name, so the cached page of every product in this category is
    // stale — but only those, not the whole catalogue.
    await invalidateProductDetailsWhere({ category: categoryId });
    await cache.bump("catalog", "products");
    return saved;
};

export const deleteCategoryService = async (categoryId: string) => {
    appAssert(mongoose.isValidObjectId(categoryId), BAD_REQUEST, "Invalid category ID");

    const category = await CategoryModel.findById(categoryId);
    appAssert(category, NOT_FOUND, "Category not found");

    await assertUnused("category", categoryId);
    // No product can reference these: it would have had to belong to this category.
    await SubCategoryModel.deleteMany({ category: categoryId });
    await category.deleteOne();
    await cache.bump("catalog");
    return { _id: categoryId };
};

export const createSubCategoryService = async ({ name, category }: SubCategorySchema) => {
    appAssert(mongoose.isValidObjectId(category), BAD_REQUEST, "Invalid category ID");

    const categoryExists = await CategoryModel.exists({ _id: category });
    appAssert(categoryExists, NOT_FOUND, "Category not found");

    const existing = await SubCategoryModel.findOne({ category, name }).collation(CASE_INSENSITIVE);
    appAssert(!existing, CONFLICT, "This category already has a type with that name");

    const created = await withDuplicateGuard("This category already has a type with that name", () =>
        SubCategoryModel.create({ name, category })
    );
    await cache.bump("catalog");
    return created;
};

export const updateSubCategoryService = async (subCategoryId: string, { name }: UpdateSubCategorySchema) => {
    appAssert(mongoose.isValidObjectId(subCategoryId), BAD_REQUEST, "Invalid type ID");

    const subCategory = await SubCategoryModel.findById(subCategoryId);
    appAssert(subCategory, NOT_FOUND, "Type not found");

    const duplicate = await SubCategoryModel.findOne({
        category: subCategory.category,
        name,
        _id: { $ne: subCategoryId },
    }).collation(CASE_INSENSITIVE);
    appAssert(!duplicate, CONFLICT, "This category already has a type with that name");

    subCategory.name = name;
    const saved = await withDuplicateGuard("This category already has a type with that name", () => subCategory.save());
    // Same again, for the products of this type only.
    await invalidateProductDetailsWhere({ subCategory: subCategoryId });
    await cache.bump("catalog", "products");
    return saved;
};

export const deleteSubCategoryService = async (subCategoryId: string) => {
    appAssert(mongoose.isValidObjectId(subCategoryId), BAD_REQUEST, "Invalid type ID");

    const subCategory = await SubCategoryModel.findById(subCategoryId);
    appAssert(subCategory, NOT_FOUND, "Type not found");

    await assertUnused("subCategory", subCategoryId);
    await subCategory.deleteOne();
    await cache.bump("catalog");
    return { _id: subCategoryId };
};
