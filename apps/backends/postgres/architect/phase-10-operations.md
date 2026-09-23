# Phase 10 — Operations

**Goal:** the service survives a deploy, reports its real health, and cleans up after itself.

**Why last:** it wraps everything already built. But **don't skip it** — the cleanup job below keeps
a promise the UI already makes to customers.

---

## Prerequisites
- Every previous phase

## 1. Replacing Mongo's TTL indexes

MongoDB deleted expired rows for you: sessions, verification links, and cancelled orders after 12
hours. **Postgres has no TTL.** Nothing deletes those rows now.

### What's actually at stake — it differs per table

| Table | Does deletion matter for correctness? |
|---|---|
| `sessions` | **No.** `authenticate` and refresh already check `expires_at > now()`, so an expired row is ignored whether or not it exists. Cleanup is about table growth. |
| `verification_links` | **No.** Verification and reset already filter on `expires_at`. Growth only. |
| cancelled `orders` | **Yes — it's a promise.** The orders page tells the customer "this order will be removed at …". If nothing removes it, that's broken. |

So: sessions and links are housekeeping; cancelled orders are user-visible behaviour.

### The recommended approach: a BullMQ repeatable job

You already run BullMQ for email and images — this is one more job in the same place.

- **Schedule it hourly with a fixed job id.** Then three API instances still schedule only one
  cleanup, not three.
- **Delete in batches**, never in one statement:
  ```sql
  DELETE FROM sessions
  WHERE id IN (SELECT id FROM sessions WHERE expires_at < now() LIMIT 5000);
  ```
  Loop until a pass deletes 0 rows. One giant `DELETE` holds locks for its whole duration and
  creates all its dead rows at once; batches keep every transaction short.
- **Do the same for** `verification_links` (`expires_at < now()`) and `orders`
  (`order_status = 'cancelled' AND cancelled_at < now() - interval '12 hours'`).
- **Log how many rows each pass removed.** A number that only ever grows means something upstream
  is leaking.

It's safe to run hourly rather than to the second because of the point above: an expired session is
already rejected, so deleting it at 10:59 instead of 10:00 changes nothing.

### Alternatives worth knowing
- **`pg_cron`** — an extension that runs the same `DELETE`s inside Postgres on a schedule. Clean,
  but not every host offers it, and it splits scheduled work across two systems.
- **Time-partitioned tables** — split by month and drop whole partitions. The right tool for huge
  log or event tables; overkill here.

### The Postgres lesson hidden in this: MVCC and autovacuum

`DELETE` doesn't free space immediately. Postgres keeps old row versions (MVCC) so concurrent
transactions still see a consistent snapshot, and **autovacuum** reclaims them later. After your
first cleanup run:
```sql
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE relname IN ('sessions', 'verification_links', 'orders');
```
Watch `n_dead_tup` jump after the delete, then fall once autovacuum runs.

### A design choice for you: delete cancelled orders, or hide them?
They're never paid (only unpaid orders can be cancelled), so deleting them loses no financial
record. But abandoned checkouts are useful analytics, and many shops keep them and simply stop
showing them to the customer after 12 hours — a `WHERE` clause on the customer's order list instead
of a `DELETE`. Either is valid; if you keep them, update the "will be removed" text in the client.

## 2. Graceful shutdown

Copy the Mongo `index.ts` shutdown and add `await prisma.$disconnect()`. The order matters:

1. stop accepting connections (`server.close()`)
2. let in-flight requests finish (with a ~10s cap)
3. close the BullMQ workers
4. disconnect the cache Redis
5. `prisma.$disconnect()`
6. exit

Without this, a deploy can kill a request **mid-transaction**. Postgres rolls it back, but the
customer sees a failure that didn't need to happen.

Also copy the `unhandledRejection` / `uncaughtException` handlers — a crash with no log is the worst
kind.

## 3. Health that means something

`/health` should check what the request path actually needs:

```ts
const dbUp    = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
const redisUp = await cache.ping();
return res.status(dbUp ? 200 : 503).json(ok({
    status: dbUp ? "ok" : "degraded",
    postgres: dbUp ? "up" : "down",
    redis: redisUp ? "up" : "down",
}));
```

Postgres down → 503 (the load balancer should stop sending traffic). Redis down → still 200: the
cache and rate limiter both degrade gracefully.

## 4. Logging and configuration

- `morgan("combined")` in production, `"dev"` locally.
- Prisma logging: `["query"]` in dev is excellent for spotting N+1; **turn it off in production**.
- `connection_limit` in `DATABASE_URL`, chosen deliberately: API + workers share the pool.
- `migrate deploy` in production, **never** `migrate dev` (it can reset the database).

## 5. Before you call it done — parity with the Mongo backend

Run both and compare, area by area:

- **auth** — register, verify, resend, login, google, refresh, logout, me (get/patch), avatar, password
- **session** — list, revoke
- **products** — list, detail, facets; admin create/update/delete, image upload/delete/cover/colour
- **catalog** — categories, sub-categories, brands (public reads, admin writes)
- **cart** — get, add, update, delete, clear, sync
- **wishlist** — get, add, toggle, remove, sync
- **checkout** — create-session, resume-session, confirm, points, pay-with-points
- **orders** — list, cancel, return; admin list, status update
- **promos** — active, apply; admin CRUD
- **settings** — banners list, upload, delete
- **dashboard** — lite, full
- **webhooks** — razorpay
- **health**

For each: same path, same status code, same response shape. The fastest check is to point the client
at one backend, use the feature, then point it at the other and repeat.

## Checkpoint
```bash
# graceful shutdown: start a slow request, then
kill -TERM <pid>     # the request finishes, then the process exits 0

# health
docker compose stop postgres && curl -i localhost:5001/health   # 503
docker compose start postgres

# cleanup job: insert an expired session and a 13-hour-old cancelled order,
# trigger the job, then confirm both are gone and the log shows the counts
```

## Done when
- [ ] The hourly cleanup job runs once (fixed job id), deletes in batches, and logs what it removed
- [ ] You've watched `n_dead_tup` rise and fall in `pg_stat_user_tables`
- [ ] You've decided: delete cancelled orders, or keep and hide them
- [ ] `SIGTERM` finishes in-flight requests before exiting
- [ ] `/health` returns 503 when Postgres is down
- [ ] Production config is separated: no query logging, `migrate deploy`, deliberate pool size
- [ ] Every area in the parity list behaves the same as the Mongo backend
