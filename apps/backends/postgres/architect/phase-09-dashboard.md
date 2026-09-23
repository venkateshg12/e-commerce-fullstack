# Phase 09 — Dashboard ⭐

**Goal:** the admin dashboard, with its analytics written as real SQL.

**Why now:** it needs orders to exist. And after eight phases of Prisma, this is where you write
Postgres directly.

---

## Prerequisites
- Phase 07, plus enough orders to aggregate (place a few, or insert them in psql)

## Files
**Copy verbatim:** `routes/dashboard.route.ts`, `controllers/dashboard.controller.ts`.
**Rewrite:** `services/dashboard.service.ts` — with `$queryRaw`, not the Prisma query API.

## Why raw SQL here

The Mongo version is aggregation pipelines. Rewriting them with `groupBy()` would teach you Prisma;
writing them as SQL teaches you Postgres — and these are exactly the queries SQL is best at.

```ts
const series = await prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
    SELECT date_trunc('day', paid_at) AS day,
           sum(total_amount)          AS revenue,
           count(*)                   AS orders
    FROM orders
    WHERE payment_status = 'paid'
      AND paid_at >= now() - ${days}::int * interval '1 day'
    GROUP BY day
    ORDER BY day;
`;
```

> Use the tagged-template form (`$queryRaw\`…\``) — it parameterises values. `$queryRawUnsafe` with
> string concatenation is SQL injection.

## The queries to write

1. **Totals** — products, categories, orders, returned orders, lifetime revenue. One `SELECT` with
   several `count(*) FILTER (WHERE …)` instead of five round trips:
   ```sql
   SELECT count(*)                                        AS total_orders,
          count(*) FILTER (WHERE order_status = 'returned') AS returned_orders,
          sum(total_amount) FILTER (WHERE payment_status = 'paid') AS revenue
   FROM orders;
   ```
2. **Revenue per day** for the range (above) — and fill gaps with `generate_series` so a day with no
   orders is `0` rather than missing:
   ```sql
   SELECT d::date AS day, coalesce(sum(o.total_amount), 0) AS revenue
   FROM generate_series(now() - '30 days'::interval, now(), '1 day') d
   LEFT JOIN orders o ON date_trunc('day', o.paid_at) = d AND o.payment_status = 'paid'
   GROUP BY d ORDER BY d;
   ```
3. **This period vs the previous one** — two ranges in one pass with `FILTER`, then percentage
   change. (`LAG()` is the window-function way; try both.)
4. **Top products** — join `order_items` to `products`, `GROUP BY`, `ORDER BY sum(quantity) DESC
   LIMIT 5`.
5. **Orders by status** — one `GROUP BY order_status`.
6. **Low stock** — variants below a threshold, joined to their product.
7. **Customers** — total, plus new in this period.

## Postgres you're practising
`date_trunc` · `generate_series` for gap-filling · `count(*) FILTER (WHERE …)` · `sum(...) OVER ()`
and `LAG()` · `LEFT JOIN` to keep empty buckets · CTEs (`WITH`) to keep a long query readable

## Checkpoint
- The admin dashboard renders the same numbers as the Mongo backend on the same data.
- A day with no orders shows `0`, not a gap.
- `EXPLAIN ANALYZE` your revenue query; add `orders(payment_status, paid_at)` if it's scanning.

## Pitfalls
- **`BigInt`.** `count(*)` and `sum()` come back as `BigInt`, and `JSON.stringify` throws on it.
  Convert with `Number(...)` before responding.
- **`sum()` of no rows is `NULL`, not `0`** — `coalesce` it.
- **Timezones:** `date_trunc('day', paid_at)` groups in UTC. If the shop reports in IST, use
  `date_trunc('day', paid_at AT TIME ZONE 'Asia/Kolkata')`.
- Cache the dashboard for ~60s (phase 08); these are the heaviest queries in the app.

## Done when
- [ ] Every dashboard number matches the Mongo backend
- [ ] All of it is raw SQL, not Prisma's query API
- [ ] The daily series has no gaps
- [ ] No `BigInt` serialisation errors
