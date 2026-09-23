# Phase 10 — Response cache

**Goal:** product pages, listings, facets, the catalog tree, active promos, the home feed, the
dashboard and the session check are served from Redis. Every write invalidates exactly what it
changed.

**Why now:** cache last, on purpose. Caching a query you haven't finished tuning hides the tuning
work, and phase 5's indexes matter more than any cache.

---

## Prerequisites
- Phases 05–09 done
- The `redis-cache` container on **6380** (`volatile-lru`, no persistence). **Never** the queue
  Redis on 6379 (`noeviction`).
- `CACHE_REDIS_HOST`, `CACHE_REDIS_PORT`, `CACHE_ENABLED` in the env schema

## The decision: your own `CacheService`, not `@nestjs/cache-manager`

`@nestjs/cache-manager` + `CacheInterceptor` caches GET responses by URL, and invalidates by
deleting keys you can name. That can't express what this app needs:

- **Versioned namespaces:** a product edit must retire *every* listing and filter combination at
  once, in O(1), without enumerating keys.
- **Per-entity keys without a version stamp:** editing one product must **not** flush every other
  product's page.
- **Never throws, fail-open, single-flight:** a Redis failure reads as a miss, concurrent misses
  share one query, and the breaker skips Redis while it's down.

`mongo/src/utils/cache` already does all of this. **Copy it verbatim** and give it a Nest shape.

## Files
```
src/infra/cache/cache.module.ts    @Global(): provides CacheService, owns the 6380 connection
src/infra/cache/cache.service.ts   thin injectable wrapper over the copied cache.getOrSet / versionedKey / bump
```

## The two invalidation styles: using the wrong one is the classic mistake

1. **Versioned namespace**, for entries you can't enumerate. Keys embed the version of each domain
   they read (`catalog`, `products`, `facets`, `promos`, `banners`). A write calls
   `cache.bump(domain)` **after it succeeds**. Product listings and the home feed live here, with a
   60s TTL.
2. **Per-entity keys**, for entries you can name: `cache:product:detail:<id>`, no version. Every
   write that changes a product calls `invalidateProductDetails([id])`: admin edits, the image
   processor (phase 6) and stock changes in `fulfillPaidOrder` and returns (phase 8).
3. **Renames:** renaming a brand, category or sub-category changes names embedded in product pages,
   so those paths call `invalidateProductDetailsWhere({ brandId })` and so on.
4. **`facets`** is bumped only where the colour list can change: product create/delete, or an update
   that touches colours or status. Never by an image or title edit.

## Steps
1. `CacheModule` + `CacheService`, and `onApplicationShutdown` closes the connection.
2. Wrap the reads: product detail, listing, facets, catalog tree, brands, active promos, home feed,
   dashboard (phase 11).
3. Add invalidation to every write, in the **service**, after the database call succeeds. Search
   for every write method and check each one. **A write that doesn't invalidate is a bug you'll find
   hours later.**
4. **The session cache:** `SessionsService.assertActive` (used by `AuthGuard`) caches an active
   session for 60s. `revokeSessions` deletes the key. It fails **closed**: if Redis is unavailable,
   every request checks Postgres. This is why all revocation goes through one function (phase 3).

## Why not a `@Cacheable()` decorator?
It's tempting: `@Cacheable("products")` on a service method. But invalidation needs the write's
arguments and has to run after the transaction commits, which a decorator hides. Explicit
`cache.getOrSet(...)` calls are easier to review, and that matters more here than saving three lines.

## NestJS you're practising
Wrapping a framework-agnostic module in a provider · `@Global()` infrastructure modules ·
deciding **against** the framework's built-in module when it doesn't fit

## Tests
- `cache.service.spec.ts`: Redis down → `getOrSet` calls the loader and returns its result, no throw.
- e2e with a real `redis-cache`: product detail is a hit on the second call. Editing product A
  invalidates A's page and not B's. Editing a title doesn't bump `facets`.
- e2e: revoke a session → the next request with its token is 401 immediately, not after 60s.

## Checkpoint
```bash
curl -s localhost:5002/products/<id> -o /dev/null -w '%{time_total}\n'   # miss
curl -s localhost:5002/products/<id> -o /dev/null -w '%{time_total}\n'   # hit, much faster
# edit that product in the admin panel → next call is a miss again; another product's page is still a hit
```

## Done when
- [ ] Every read listed above is cached, and every write invalidates the right style
- [ ] The app serves correctly with `redis-cache` stopped
- [ ] Session revocation takes effect immediately
