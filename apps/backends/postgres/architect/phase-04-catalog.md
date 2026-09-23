# Phase 04 — Catalog ⭐

**Goal:** the storefront browses, filters, sorts and paginates products; the admin panel manages
categories, sub-categories, brands and products.

**Why now:** the cart can't exist without products, and this is the largest body of SQL in the
project.

---

## Prerequisites
- Phase 02 (admin routes need `authenticate` + `requireAdmin`)
- Seed rows from phase 01

## Files

**Copy verbatim:** `routes/product.route.ts`, `routes/catalog.route.ts`,
`controllers/product.controller.ts`, `controllers/catalog.controller.ts`, `utils/variants.ts`.

The controllers are already thin — parse, call one service, return — so they port untouched.

**Rewrite:** `services/product.service.ts`, `services/catalog.service.ts`.

## The query that matters

One function, `listProductsService(filters, { includeInactive })`, covering search, five filters,
three sorts, pagination and a total:

```ts
const where: Prisma.ProductWhereInput = {
    ...(search && { title: { contains: search, mode: "insensitive" } }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(subCategoryId && { subCategoryId }),
    ...(color && { variants: { some: { color } } }),   // JOIN, not a second round trip
    ...(size && { variants: { some: { size } } }),
    ...(includeInactive ? {} : { status: "active" }),
};

const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
        where,
        include: { brand: true, category: true, subCategory: true, images: true, variants: true },
        orderBy: SORT_OPTIONS[sort],
        skip: (page - 1) * limit,
        take: limit,
    }),
    prisma.product.count({ where }),
]);
```

Two things to carry over from the Mongo version:
- **`includeInactive` is an argument, not a `req.role` read.** Services never touch `req`.
- **Response shape:** rows in `data`, `{ page, limit, total, hasMore }` in `meta`.

## Steps
1. `catalog.service.ts` first — categories, sub-categories, brands. Small, and products reference
   them. Keep the "refuse to delete while products reference it" rule: with an FK set to `Restrict`,
   Postgres enforces it for you — catch the FK violation and return the friendly 409.
2. `product.service.ts`: create → update → images → delete → **list** → detail → facets.
3. Variants: replace the embedded array with `product_variants` rows. Creating a product writes its
   variant grid; updating replaces it. The `@@unique(productId, color, size)` from phase 01 stops
   duplicates.
4. Facets = `SELECT DISTINCT` over colours of active products.

## Postgres you're practising — the hour that pays for itself

With data in the table, run the listing query by hand and read the plan:

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE status = 'active' AND category_id = '<id>'
ORDER BY created_at DESC LIMIT 24;
```

Then:
- `DROP INDEX products_status_created_at_idx;` → re-run → watch `Index Scan` become `Seq Scan`, and
  compare the timings. Recreate it.
- Compare `title ILIKE '%shirt%'` with and without `products_title_trgm_idx`.
- Try `OFFSET 10000` and notice it gets slower — that's why keyset pagination exists (not needed at
  this size, but know why).

## Checkpoint
- The storefront collections page filters by category, brand, colour and size, sorts three ways,
  and "Load more" pages through.
- `curl 'localhost:5001/products?limit=5'` → 5 rows plus `meta.total` / `meta.hasMore`.
- `curl 'localhost:5001/products?limit=1000'` → 400 (the shared schema caps it at 100).
- `curl 'localhost:5001/products?category=not-a-uuid'` → 400, not 500.
- `EXPLAIN ANALYZE` on the listing query shows an index scan.

## Pitfalls
- **N+1:** fetching products then looping to fetch each brand. `include` does it in one query —
  check the query log in dev.
- **`include` pulls whole rows.** Use `select` where the client only needs a few columns.
- **Sort must be deterministic.** Two products with the same price need a tiebreaker (`id`), or
  pagination can repeat or skip rows.

## Done when
- [ ] Admin can CRUD categories, sub-categories, brands, products (with variants and images)
- [ ] Deleting a referenced brand returns 409, not a 500
- [ ] The storefront filters, sorts and pages correctly
- [ ] You have read an `EXPLAIN ANALYZE` plan and seen an index change it
