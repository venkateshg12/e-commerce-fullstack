// Reports categories whose names differ only by case or surrounding space.
//
// Category names are now unique case-insensitively, the way brands and sub-categories already were.
// Mongo builds that index at startup, and the build FAILS (leaving the index absent, with an error
// in the log) if duplicates already exist. Run this first: it only reports, never merges or deletes,
// because deciding which duplicate survives means moving the products that reference the other one.
//
//   pnpm --filter auth-service check:categories
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";

async function main() {
    await connectDB();
    const categories = mongoose.connection.collection("categories");
    const products = mongoose.connection.collection("products");

    const all = await categories.find({}, { projection: { name: 1 } }).toArray();

    const groups = new Map<string, typeof all>();
    for (const category of all) {
        if (typeof category.name !== "string") continue;
        const key = category.name.trim().toLowerCase();
        groups.set(key, [...(groups.get(key) ?? []), category]);
    }

    const duplicates = [...groups.entries()].filter(([, group]) => group.length > 1);

    if (duplicates.length === 0) {
        console.log(`No duplicate category names among ${all.length} categories. The unique index will build.`);
        return;
    }

    console.warn(`${duplicates.length} duplicated category name(s) — the unique index cannot build until these are resolved:\n`);

    for (const [name, group] of duplicates) {
        console.warn(`  "${name}"`);
        for (const category of group) {
            const productCount = await products.countDocuments({ category: category._id });
            console.warn(`    ${category._id}  name=${JSON.stringify(category.name)}  products=${productCount}`);
        }
    }

    console.warn("\nKeep one of each, move its products over, then delete the others.");
    process.exitCode = 1;
}

main()
    .catch((error) => {
        console.error("Category duplicate check failed:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
