# Phase 11 — Admin dashboard (raw SQL) ⭐

**Goal:** `GET /dashboard/lite` and `GET /admin/dashboard` return the same numbers as the Mongo
dashboard for the same data, computed with SQL you wrote by hand.

**Why now:** it reads orders, products and categories, so it needs real order data from phase 8.
It's also the best SQL practice in the project.

---

## Prerequisites
- Phase 08 done, and a handful of paid, cancelled and returned orders to aggregate
- Spike row 8 from phase 2: how you run raw SQL (Prisma 8's raw lane, or the shared `pg` pool)

## Files
```
src/modules/dashboard/  dashboard.module.ts, dashboard.controller.ts, dashboard.service.ts,
                        dashboard.sql.ts   (the queries, one exported constant each)
```
The controller is `@Roles("admin")` at the class level. `/admin/dashboard` takes `?days=` validated
by a Zod schema, as today.

## Why raw SQL here

These are reports: `GROUP BY`, `date_trunc`, `FILTER`, window functions. An ORM query builder
either can't express them or hides what the database is doing. Keep them as SQL strings in one
file, parameterised, reviewed like code.

## The queries

**Lite:** the counts in **one** round trip instead of five:
```sql
SELECT
  (SELECT count(*) FROM products)                                        AS total_products,
  (SELECT count(*) FROM categories)                                      AS total_categories,
  count(*)                                                               AS total_orders,
  count(*) FILTER (WHERE order_status = 'returned')                      AS returned_orders,
  coalesce(sum(total_amount) FILTER (WHERE payment_status = 'paid'), 0)  AS revenue_paise
FROM orders;
```

**Revenue by day for the last N days:**
```sql
SELECT date_trunc('day', paid_at) AS day, sum(total_amount) AS revenue_paise, count(*) AS orders
FROM orders
WHERE payment_status = 'paid' AND paid_at >= now() - make_interval(days => $1)
GROUP BY 1 ORDER BY 1;
```

Then the ones Mongo made awkward. Try each:
- **Top products** by units sold with a `LATERAL` join to fetch each product's cover image.
- **Period-over-period change** with `LAG()` over the daily series.
- **Days with no orders** included (as zeros) with `generate_series` + `LEFT JOIN`, so the chart has
  no gaps.

## Steps
1. Write each query in `psql` against the Neon branch first. Check it with `EXPLAIN ANALYZE`.
2. Move it into `dashboard.sql.ts` as a constant with `$1`-style parameters. **Never interpolate a
   value into the string**, not even `days`.
3. `DashboardService` runs them and **converts the types:** `count(*)` and `sum()` come back as
   `bigint` / `numeric` strings. Convert to `number` before returning, or `JSON.stringify` throws on
   the `bigint`.
4. Map to exactly the response shape `mongo/src/services/dashboard.service.ts` returns. The admin UI
   is the harness.
5. Wrap both in the cache (`cache:dashboard:lite` and a versioned key), with the same TTL as Mongo's
   `DASHBOARD_TTL_SECONDS`.

## Postgres you're practising
`FILTER (WHERE …)` · `date_trunc` · `generate_series` · `LATERAL` · window functions (`LAG`,
`SUM() OVER`) · CTEs · `bigint`/`numeric` types in results · parameterised queries

## Tests
- e2e against docker Postgres with a fixed fixture of orders: exact expected numbers for each query,
  including a day with zero orders.
- The response contains no `bigint` (serialise it with `JSON.stringify` in the test).

## Checkpoint
Run the Mongo and Nest backends over equivalent data: the admin dashboard shows the same numbers on
both.

## Pitfalls
- **Timezones:** `date_trunc('day', paid_at)` truncates in the session timezone (UTC on Neon). If the
  business day is IST, use `date_trunc('day', paid_at AT TIME ZONE 'Asia/Kolkata')`, and decide this
  on purpose.
- **Money:** sum in paise, convert to rupees only at the response edge, if the client expects rupees.

## Done when
- [ ] Both dashboard routes match the Mongo numbers
- [ ] Every query is parameterised and has been read under `EXPLAIN ANALYZE`
- [ ] No `bigint` reaches the JSON serialiser
