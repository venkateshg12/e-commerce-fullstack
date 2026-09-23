# Phase 05 — Catalog ⭐

**Goal:** the storefront browses, filters, sorts and paginates products, and the admin panel
manages categories, sub-categories, brands and products (not images yet: that's phase 6).

**Why now:** the cart can't exist without products, and this is the largest body of query code in
the project.

---

## Prerequisites
- Phase 04 done
- Seed rows from phase 2

## Files

**Create**
```
src/modules/catalog/   catalog.module.ts, catalog.controller.ts, catalog.service.ts
                       (categories, sub-categories, brands: public reads + /admin writes)
src/modules/products/  products.module.ts, products.controller.ts, admin-products.controller.ts,
                       products.service.ts, product-query.ts (the listing query builder)
```
**Copy verbatim:** `mongo/src/utils/variants.ts`.

Two controllers in `products/` keep things readable: `ProductsController` holds the `@Public()`
reads, and `AdminProductsController` is `@Controller("admin/products") @Roles("admin")` at the
**class** level, so every method inherits both.

## The listing query

One service method, `list(filters, { includeInactive })`. It handles search, category, brand,
sub-category, colour and size filters, three sorts, pagination and a total. The shape is the same
as `../postgres/architect/phase-04-catalog.md`; write it with the Prisma 8 calls from your
`SPIKE.md`:

- **Filters on variants** (colour, size) are an *exists* condition on the relation (spike row 6),
  so the database does one JOIN, not a second round trip.
- **Items and total** run in parallel, `Promise.all([findPage, count])`, or in one transaction if
  you need a consistent snapshot.
- **Return `new Paginated(items, { page, limit, total, hasMore: page * limit < total })`.** The
  phase-1 interceptor puts the numbers into `meta`.
- **`includeInactive` is an argument.** The controller computes it from `@CurrentUser()`, and the
  service never reads the request.

The query string is validated with the shared schemas:
```ts
@Public()
@RateLimit(limits.publicCatalog)
@Get("products")
list(@Query(new ZodValidationPipe(productSearchSchema)) q: ProductSearch) {
    return this.products.list(q, { includeInactive: false });
}
```
`paginationQuerySchema` in `@repo/types` caps `limit` at 100. `?limit=1000` has to be a 400, not a
slow query.

## Steps
1. `CatalogService` first (categories, sub-categories, brands). It's small, and products reference
   it.
2. **Deleting something still in use:** the FK is `Restrict`, so Postgres refuses the delete.
   Catch the FK-violation error (Postgres code `23503`) in the service and throw
   `AppError(CONFLICT, "…still has products")`. Don't pre-check with a count: the constraint is the
   source of truth, and a pre-check can race.
3. **Case-insensitive unique names** (`lower(name)` index): catch `23505` and return the same 409
   the Mongo backend returns.
4. `ProductsService`: create (with its variant grid) → update → delete → list → detail → facets.
   Updating variants replaces the grid in a transaction.
5. Facets = the distinct colours of active products.
6. Route the product-detail `:id` through a `ParseUUIDPipe`. A malformed id then gets a 400 instead
   of a Postgres cast error (a 500).

Put the Postgres error-code mapping in one small helper (`src/infra/db/pg-errors.ts`) so every
service handles `23503` / `23505` the same way.

## NestJS you're practising
Class-level decorators (`@Controller`, `@Roles`) · `@Query()` with a pipe · built-in pipes
(`ParseUUIDPipe`) · splitting public and admin controllers in one module · returning a marker class
the interceptor recognises

## Postgres you're practising
Run the listing query under `EXPLAIN ANALYZE` with and without each index, exactly as phase 4 of
the Postgres plan describes. Enable the logging option you found in the spike, so you can copy the
generated SQL straight into `psql`.

## Tests
- `product-query.spec.ts`: each filter combination produces the conditions you expect (no
  database).
- e2e against the seeded docker database: filter by each field, sort three ways, page through,
  `limit=1000` → 400, `id=not-a-uuid` → 400, deleting a brand with products → 409.

## Checkpoint
- The storefront collections page filters, sorts and "Load more" pages through, on port 5002.
- `curl 'localhost:5002/products?limit=5'` returns 5 rows, and `meta.total` / `meta.hasMore` match
  the Mongo backend's for the same data.
- Admin: create a category, a brand and a product with variants from the admin panel.

## Pitfalls
- **N+1 queries**: loading brand/category per product in a loop. Load the relations in the same
  query (spike row 5).
- **`OFFSET` pagination** gets slower as the offset grows. That's fine at this size, but know why
  keyset pagination exists.
- **Money:** prices go in and out as paise integers. Convert only at the edge, if the client
  expects rupees.

## Done when
- [ ] Every catalog and product route (except images) matches the Mongo backend
- [ ] `EXPLAIN ANALYZE` shows index scans for the common listing query
- [ ] FK and unique violations become 409s, never 500s
