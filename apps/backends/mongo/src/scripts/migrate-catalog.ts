// One-time migration to the Category → SubCategory / Brand catalog structure.
//   - products.brand: free-text name  →  Brand ObjectId
//   - products.productType: string    →  products.subCategory (SubCategory under the product's category)
// Works on the raw collections so old-shape documents don't trip the Mongoose schema.
// Idempotent: a second run finds nothing left to convert.
//
//   pnpm --filter auth-service migrate:catalog
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import BrandModel from "../models/brand.model";
import SubCategoryModel from "../models/subCategory.model";
import ProductModel from "../models/product.model";

// The brands the admin dropdown used to hardcode, so it isn't empty after the switch.
const DEFAULT_BRANDS = [
    "Nike", "Adidas", "Puma", "Zara", "H&M", "Levi's", "Uniqlo", "Mango", "Calvin Klein", "Tommy Hilfiger",
];

const CASE_INSENSITIVE = { locale: "en", strength: 2 };

async function findOrCreateBrand(name: string, counts: { brandsCreated: number }) {
    const existing = await BrandModel.findOne({ name }).collation(CASE_INSENSITIVE);
    if (existing) return existing._id;
    counts.brandsCreated++;
    return (await BrandModel.create({ name }))._id;
}

async function findOrCreateSubCategory(
    name: string,
    category: mongoose.Types.ObjectId,
    counts: { typesCreated: number }
) {
    const existing = await SubCategoryModel.findOne({ name, category }).collation(CASE_INSENSITIVE);
    if (existing) return existing._id;
    counts.typesCreated++;
    return (await SubCategoryModel.create({ name, category }))._id;
}

async function main() {
    await connectDB();
    // Build the unique indexes before inserting so duplicates can't slip in.
    await Promise.all([BrandModel.syncIndexes(), SubCategoryModel.syncIndexes()]);

    const counts = { brandsCreated: 0, typesCreated: 0, brandsRelinked: 0, typesRelinked: 0 };
    const products = ProductModel.collection;

    for (const name of DEFAULT_BRANDS) {
        await findOrCreateBrand(name, counts);
    }

    const withStringBrand = await products.find({ brand: { $type: "string" } }).toArray();
    for (const product of withStringBrand) {
        const name = String(product.brand).trim();
        if (!name) continue;
        const brandId = await findOrCreateBrand(name, counts);
        await products.updateOne({ _id: product._id }, { $set: { brand: brandId } });
        counts.brandsRelinked++;
    }

    const withProductType = await products.find({ productType: { $exists: true } }).toArray();
    for (const product of withProductType) {
        const name = typeof product.productType === "string" ? product.productType.trim() : "";
        if (name && product.category && !product.subCategory) {
            const subCategoryId = await findOrCreateSubCategory(name, product.category, counts);
            await products.updateOne(
                { _id: product._id },
                { $set: { subCategory: subCategoryId }, $unset: { productType: "" } }
            );
            counts.typesRelinked++;
        } else {
            await products.updateOne({ _id: product._id }, { $unset: { productType: "" } });
        }
    }

    console.log(`Brands created:            ${counts.brandsCreated}`);
    console.log(`Products relinked to brand: ${counts.brandsRelinked}`);
    console.log(`Types created:             ${counts.typesCreated}`);
    console.log(`Products relinked to type:  ${counts.typesRelinked}`);
}

main()
    .catch((error) => {
        console.error("Catalog migration failed:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
