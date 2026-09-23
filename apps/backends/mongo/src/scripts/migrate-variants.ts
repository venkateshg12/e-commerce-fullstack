// One-time migration from a single product-level `stock` number to per-variant stock.
//   - products.stock: 120  →  products.variants: [{ color, size, stock }, …]
// One row per (colour × size); a product with neither gets a single keyless row. The old total is
// split evenly across the rows, with the remainder on the first, for the admin to correct
// afterwards in Manage Products.
// Works on the raw collection so old-shape documents don't trip the Mongoose schema.
// Idempotent: a product that already has variants is skipped, so a second run finds nothing.
//
//   pnpm --filter auth-service migrate:variants
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import ProductModel from "../models/product.model";
import { ProductSize, ProductVariant } from "../types/product.types";

const splitStock = (total: number, rows: number): number[] => {
    if (rows <= 0) return [];
    const base = Math.floor(total / rows);
    const remainder = total - base * rows;
    // The remainder lands on the first row rather than being dropped, so the sum still matches
    // what the product had before the migration.
    return Array.from({ length: rows }, (_, index) => (index === 0 ? base + remainder : base));
};

const buildVariants = (
    colors: string[],
    sizes: ProductSize[],
    total: number
): ProductVariant[] => {
    const colorSlots: (string | undefined)[] = colors.length ? colors : [undefined];
    const sizeSlots: (ProductSize | undefined)[] = sizes.length ? sizes : [undefined];

    const pairs: { color?: string; size?: ProductSize }[] = [];
    for (const color of colorSlots) {
        for (const size of sizeSlots) {
            pairs.push({ color, size });
        }
    }

    const counts = splitStock(total, pairs.length);
    return pairs.map((pair, index) => ({ ...pair, stock: counts[index] ?? 0 }));
};

async function main() {
    await connectDB();

    const products = ProductModel.collection;
    const counts = { migrated: 0, skipped: 0, rowsCreated: 0 };

    const pending = await products
        .find({ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] })
        .toArray();

    for (const product of pending) {
        const colors: string[] = Array.isArray(product.colors)
            ? product.colors.filter(Boolean)
            : [];
        const sizes: ProductSize[] = Array.isArray(product.sizes)
            ? product.sizes.filter(Boolean)
            : [];
        const total = typeof product.stock === "number" && product.stock > 0 ? product.stock : 0;

        const variants = buildVariants(colors, sizes, total);

        await products.updateOne(
            { _id: product._id },
            { $set: { variants }, $unset: { stock: "" } }
        );

        counts.migrated++;
        counts.rowsCreated += variants.length;
    }

    // Products that already have variants may still carry the dead field from an earlier run.
    const leftover = await products.updateMany(
        { stock: { $exists: true } },
        { $unset: { stock: "" } }
    );
    counts.skipped = leftover.modifiedCount;

    console.log(`Products migrated:      ${counts.migrated}`);
    console.log(`Variant rows created:   ${counts.rowsCreated}`);
    console.log(`Stale 'stock' removed:  ${counts.skipped}`);
}

main()
    .catch((error) => {
        console.error("Variant migration failed:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
