# Phase 08 — Response cache

**Goal:** product pages, listings, the home feed and the session check are served from Redis.

**Why now:** cache last, on purpose. Caching a query you haven't finished tuning hides the tuning
work — and phase 04's indexes matter more than any cache.

---

## Prerequisites
- Phases 04 and 07 (there must be something worth caching)
- The `redis-cache` container on **6380** (`volatile-lru`) — *not* the queue Redis on 6379

## Files — copied verbatim
```
utils/cache/{cache,index}.ts
config/redis.ts          (add getCacheRedisConfig if you trimmed it in phase 03)
```
Then add the cache calls into the services you wrote in phases 02, 04 and 07.

## The two invalidation styles — using the wrong one is the classic mistake

1. **Versioned namespace** — for entries you can't enumerate. Keys embed a version per domain
   (`catalog`, `products`, `facets`, `promos`, `banners`); a write calls `cache.bump(domain)`, which
   retires every entry of that domain at once, O(1). Product **listings** and the home feed live
   here: editing a product can move it into or out of any filter combination, so they all have to go.
   Their TTL is short (60–120s) for that reason.

2. **Per-entity keys** — for entries you can name. A product's detail page is
   `cache:product:detail:<id>` with **no version stamp**, so editing one product doesn't flush every
   other product's page. Every write that changes a product calls `invalidateProductDetails([id])`.

   This distinction was a real bug in the Mongo backend: everything lived under one version, so
   editing one phone flushed every shirt, trouser and shoe page too.

3. **Renames are the subtle case.** A product page embeds its brand/category/type *names*, so
   renaming a brand invalidates the pages of that brand's products — `invalidateProductDetailsWhere`.
   Creating a brand invalidates nothing; deleting one is impossible while products reference it.

## Steps
1. Copy `utils/cache`, add `CACHE_REDIS_HOST/PORT`, `CACHE_ENABLED`.
2. Wrap the reads: product detail, product listing, facets, catalog tree, brands, active promos,
   home feed, dashboard.
3. Add invalidation to every write — and make it a habit: **a write that doesn't invalidate is a
   bug you'll find hours later.**
4. Add the 60s session cache in `authenticate`, with `revokeSessions` clearing the key. It fails
   **closed**: if Redis is unavailable, every request checks Postgres.

## Properties to keep (they were all earned)
- Never throws — a Redis failure reads as a miss and the request goes to Postgres.
- Skips Redis entirely while the client isn't connected, so a burst at boot doesn't trip the breaker.
- Single-flight: concurrent misses on one key share one database query.
- Hit and miss return the identical shape (serialise once, return the parsed copy).

## Checkpoint
```bash
curl -s localhost:5001/products/<id> -o /dev/null -w '%{time_total}\n'   # miss
curl -s localhost:5001/products/<id> -o /dev/null -w '%{time_total}\n'   # hit, much faster
redis-cli -p 6380 --scan --pattern 'cache:product:detail:*'

# edit product A in the admin panel, then:
redis-cli -p 6380 --scan --pattern 'cache:product:detail:*'   # A gone, B still there

docker compose stop redis-cache && curl localhost:5001/products/<id>      # still 200
docker compose start redis-cache
```

## Pitfalls
- **Wrong Redis.** The cache must be the evicting instance (6380). Pointed at 6379, a full cache
  starts refusing BullMQ writes and emails stop sending.
- **Admins bypass the cache** — they see inactive products, which must never be cached for shoppers.
- **Don't cache anything per-user** (cart, orders, points) under a shared key.

## Done when
- [ ] Repeat reads are hits; `cache:` keys exist on 6380
- [ ] Editing one product invalidates only that product's page
- [ ] Renaming a brand refreshes that brand's products
- [ ] With the cache container stopped, everything still works
