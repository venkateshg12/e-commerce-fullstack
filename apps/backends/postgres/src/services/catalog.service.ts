import z from "zod";
import { BrandSchema, CategorySchema, SubCategorySchema } from "@repo/types";
import { orm, pool } from "../prisma/db";
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from "../constants/http";
import appAssert from "../utils/errors/appAssert";

// Ids are uuid columns: a malformed one would make Postgres throw (a 500) instead of a clean 400.
const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

// Case-insensitive but accent-sensitive, like the mongo version's { locale: "en", strength: 2 }
// collation: "apple" sorts with "Apple", not after every capitalised name as a byte-order sort
// would put it. ("accent" is strength 2; "base" would be strength 1, ignoring accents too.)
const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "accent" });

// Every category with its sub-categories embedded, both sorted by name.
export const getCategoriesWithSubCategoriesService = async () => {
    const categories = await orm.Category
        .select("id", "name")
        .include("subCategories", (subCategories) => subCategories.select("id", "name"))
        .all();

    // Sorted here rather than in SQL: Postgres orders by the database's collation, which may be
    // case-sensitive, and the catalog is small enough that sorting it in memory costs nothing.
    return [...categories]
        .sort(byName)
        .map((category) => ({
            ...category,
            subCategories: [...category.subCategories].sort(byName),
        }));
};

// Phase 08 (cache): wrap the read above in cache.getOrSet under the versioned "catalog" key, with
// a 1-hour TTL; every category/sub-category write then bumps "catalog".



/*
  Postgres reports a unique-index violation as SQLSTATE 23505 — Prisma 8 normalises it onto
  `sqlState`, a raw pg error carries it on `code`. Here that means the lower(name) index rejected a
  name that already exists in another case.
 */
const isDuplicateKeyError = (error: unknown) => {
    const err = error as { sqlState?: string; code?: string } | null;
    return err?.sqlState === "23505" || err?.code === "23505";
};

const withDuplicateGuard = async <T>(message: string, run: () => Promise<T>) => {
    try {
        return await run();
    } catch (error) {
        appAssert(!isDuplicateKeyError(error), CONFLICT, message);
        throw error;
    }
};

export const createCategoryService = async ({ name }: CategorySchema) => {
    // No separate "does it exist?" query: the unique index on lower(name) (category_name_lower)
    // rejects "men" when "Men" exists, and checks atomically, so two admins creating the same
    // category at once can't both succeed — a pre-check could not promise that.
    const created = await withDuplicateGuard("Category name already exists", () =>
        orm.Category.create({ name })
    );

    // Phase 08 (cache): bump "catalog" so the category tree is re-read.
    return created;
};

export const updateCategoryService = async (categoryId: string, { name }: CategorySchema) => {
    appAssert(isUuid(categoryId), BAD_REQUEST, "Invalid category ID");

    /*
      One UPDATE instead of find → duplicate check → save. The lower(name) index rejects a name
      another category already has; renaming a category to a different case of its own name
      ("men" → "Men") is allowed, since the index only compares it against other rows. `update()`
      returns null when no row has this id, which is the not-found case.
     */
    const updated = await withDuplicateGuard("Category name already exists", () =>
        orm.Category
            .where({ id: categoryId })
            .update({ name, updatedAt: new Date().toISOString() })
    );
    appAssert(updated, NOT_FOUND, "Category not found");

    // Phase 08 (cache): bump "catalog" and "products", and invalidate the cached detail page of every
    // product in this category — those pages include the category's name.
    return updated;
};



/*
  The colour filter on the storefront: every colour any ACTIVE product is sold in. `colors` is a
  text[] column, so unnest() turns each product's array into rows and DISTINCT removes repeats —
  the database returns the few distinct colours instead of every product's array. The ORM has no
  unnest, so this goes through the shared pool like the health check does.
 */
export const getProductFacetsService = async () => {
    const { rows } = await pool.query<{ color: string }>(
        `SELECT DISTINCT unnest("colors") AS "color" FROM "public"."product" WHERE "status" = 'active'`
    );

    const colors = rows
        .map((row) => row.color)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    // Phase 08 (cache): wrap this in cache.getOrSet under the versioned "facets" key.
    return { colors };
};



// Every brand, sorted by name the same case-insensitive way as the category tree.
export const getBrandsService = async () => {
    const brands = await orm.Brand.select("id", "name").all();

    // Phase 08 (cache): wrap this read in cache.getOrSet under the versioned "catalog" key
    // ("brands"), with a 1-hour TTL; every brand write then bumps "catalog".
    return [...brands].sort(byName);
};


export const createBrandService = async ({ name }: BrandSchema) => {
    const existing = await orm.Brand.
        where({ name }).select("name").first();
    appAssert(!existing, CONFLICT, "Brand name already exists");

    const created = await withDuplicateGuard("Brand name already exists", () => orm.Brand.create({ name }));
    return created;
};


export const updateBrandService = async (
    brandId: string,
    { name }: BrandSchema
) => {

    appAssert(isUuid(brandId),BAD_REQUEST, "Invalid brand ID");

    const brand = await orm.Brand.
    where({id: brandId}).select("id").first();
    appAssert(brand, NOT_FOUND, "Brand not found");

    const updated = await withDuplicateGuard("Brand name already exists", () =>
        orm.Brand
            .where({ id: brandId })
            .update({ name, updatedAt: new Date().toISOString() })
    );

    return updated;
}


// Postgres reports "rows still reference this one" as SQLSTATE 23503.
const isForeignKeyError = (error: unknown) => {
    const err = error as { sqlState?: string; code?: string } | null;
    return err?.sqlState === "23503" || err?.code === "23503";
};

/*
  The Postgres counterpart of mongo's assertUnused. Mongo had no foreign keys, so it counted the
  products before deleting; here product.brandId / categoryId / subCategoryId refuse the delete
  themselves (ON DELETE NO ACTION), atomically. So: try the delete, and only if Postgres refuses,
  count the products to say how many are in the way. `column` is one of three fixed names, never
  user input, so it's safe to place in the SQL.
 */
const withReferenceGuard = async <T>(
    column: "brandId" | "categoryId" | "subCategoryId",
    id: string,
    runDelete: () => Promise<T>
) => {
    try {
        return await runDelete();
    } catch (error) {
        if (!isForeignKeyError(error)) throw error;

        const { rows } = await pool.query<{ count: number }>(
            `SELECT count(*)::int AS "count" FROM "public"."product" WHERE "${column}" = $1`,
            [id]
        );
        const count = rows[0]?.count ?? 0;
        appAssert(
            count === 0,
            CONFLICT,
            `Used by ${count} product${count === 1 ? "" : "s"} — reassign them first`
        );
        // Refused, but by a reference this count doesn't cover.
        appAssert(false, CONFLICT, "Still in use by products — reassign them first");
    }
};

export const deleteBrandService = async (brandId: string) => {
    appAssert(isUuid(brandId), BAD_REQUEST, "Invalid brand ID");

    // delete() returns the deleted row, or null if there was no such brand.
    const deleted = await withReferenceGuard("brandId", brandId, () =>
        orm.Brand.where({ id: brandId }).delete()
    );
    appAssert(deleted, NOT_FOUND, "Brand not found");

    // Phase 08 (cache): bump "catalog".
    return { id: brandId };
};

export const deleteCategoryService = async (categoryId: string) => {
    appAssert(isUuid(categoryId), BAD_REQUEST, "Invalid category ID");

    /*
      One DELETE does what mongo did in two steps. subCategory.categoryId is ON DELETE CASCADE, so
      the category's types go with it. If any product is in this category, product.categoryId
      refuses, and because it's a single statement the cascaded types are not deleted either.
     */
    const deleted = await withReferenceGuard("categoryId", categoryId, () =>
        orm.Category.where({ id: categoryId }).delete()
    );
    appAssert(deleted, NOT_FOUND, "Category not found");

    // Phase 08 (cache): bump "catalog".
    return { id: categoryId };
};

export const createSubCategoryService = async ({ name, category }: SubCategorySchema) => {
    appAssert(isUuid(category), BAD_REQUEST, "Invalid category ID");

    /*
      The database answers both of mongo's pre-checks in the insert itself:
      - subCategory.categoryId is a foreign key, so a category that doesn't exist fails with 23503;
      - the sub_category_name_lower index is unique on (categoryId, lower(name)), so a second
        "shirts" under the same category fails with 23505 — while "Shirts" under another category
        is fine.
     */
    try {
        const created = await orm.SubCategory.create({ name, categoryId: category });

        // Phase 08 (cache): bump "catalog" so the category tree is re-read.
        return created;
    } catch (error) {
        appAssert(!isForeignKeyError(error), NOT_FOUND, "Category not found");
        appAssert(!isDuplicateKeyError(error), CONFLICT, "This category already has a type with that name");
        throw error;
    }
};
