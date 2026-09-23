# Building the backend again on Node.js + PostgreSQL

A step-by-step plan for rebuilding this e-commerce backend in `apps/backends/postgres`, using
**Prisma** on **PostgreSQL**, with the aim of practising Postgres properly along the way.

---

## The one rule that makes this easy

**The API stays identical to the Mongo backend.** Same routes, same
`{ status, data, meta, errors }` envelope, same httpOnly cookie auth.

That gives you three things:

1. The existing React client in `apps/client` becomes your test harness — no frontend work at all.
2. Every phase is verifiable in a real browser, not just in `psql`.
3. When you're done, switching backends is one line: point `VITE_API_URL` at the new port.

Run them side by side — Mongo on `5000`, Postgres on `5001` — and compare responses as you go.

### What you actually have to rewrite

The backend has ~100 files. **Only two folders are Mongo-specific: `services/` and `models/`.**
Every controller, route, middleware, job, queue, and util file imports no mongoose at all, so they
copy across untouched. (This is why the controllers were refactored to call services — it paid for
itself here.)

| Folder | What to do |
|---|---|
| `constants/`, `utils/api`, `utils/errors`, `utils/date`, `utils/auth`, `utils/email`, `utils/currency` | **Copy verbatim** |
| `utils/rateLimiter`, `utils/cache`, `config/redis`, `config/rateLimiter` | **Copy verbatim** (Redis, not Mongo) |
| `jobs/**`, `middleware/**`, `routes/**`, `controllers/**` | **Copy verbatim** |
| `models/**` | **Replace** with `prisma/schema.prisma` |
| `services/**` | **Rewrite** — ~12 files, the real work |

---

## Stack

```
PostgreSQL 16        the database
Prisma               schema, migrations, typed client
Express 5            same as now
BullMQ + Redis       same as now (already storage-agnostic)
Zod via @repo/types  same shared schemas as the client
```

### Practising Postgres, not just Prisma

Prisma hides SQL by design. Three habits keep the learning in:

1. **Read every generated migration** in `prisma/migrations/` before you apply it. That `.sql` file
   is the real DDL — it is the thing worth understanding.
2. **Hand-edit migrations** for what Prisma's schema language can't express: `UNIQUE (lower(name))`,
   the `pg_trgm` search index, partial indexes.
3. **Use `$queryRaw` for the dashboard** (phase 9). Write those analytics as real SQL.

---

## Mongo → Postgres translation table

Keep this open while you work.

| Mongo today | Postgres / Prisma |
|---|---|
| Embedded `address[]` on the user | `addresses` table with a FK to `users` |
| Embedded `variants[]`, `images[]` on a product | `product_variants`, `product_images` tables |
| `populate()` | `include` / `select` — one JOIN, no N+1 |
| `$inc` + `arrayFilters` oversell guard | `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`, then assert `count > 0` |
| `session.withTransaction()` | `prisma.$transaction(async (tx) => { … })` |
| TTL indexes (sessions, verification links, cancelled orders) | **No equivalent** — a scheduled cleanup job (phase 10) |
| Case-insensitive unique (brand, category) | `@db.Citext`, or `UNIQUE (lower(name))` hand-added in the migration |
| `countDocuments()` | `count()` |
| `estimatedDocumentCount()` | `reltuples` from `pg_class`, or just `count(*)` |
| `$regex` title search (a collection scan) | `pg_trgm` GIN index, or `tsvector` full-text |
| Aggregation pipelines (dashboard) | `$queryRaw`: `GROUP BY`, `date_trunc`, `FILTER`, CTEs |
| `_id: ObjectId` | `id uuid default gen_random_uuid()` |
| Money as whole rupees in a `Number` | `integer` **paise** (matches what Razorpay expects) |

> **On money — decided: `Int` paise, never `Float`/`double`.** Floating point can't store most
> decimals exactly (`0.1 + 0.2 ≠ 0.3`), so totals drift and the gateway-amount check at checkout can
> reject a real payment. Razorpay works in whole paise, so nothing is lost. When a calculation yields
> fractions (discounts, later GST), compute exactly and round once at a defined point. Full reasoning
> in `architect/phase-01-schema.md`.

---

# The phases

Build in this order. Each phase depends on the ones before it, and each ends with a checkpoint you
can actually run.

---

## Phase 0 — Skeleton

**Goal:** an Express server that boots, connects, and answers `/health`.

```
apps/backends/postgres/
├── package.json          name: "postgres-service"
├── tsconfig.json         copy from ../mongo
├── .env.example
├── prisma/
│   └── schema.prisma     from `npx prisma init`
└── src/
    ├── index.ts          copy from ../mongo, strip the routes for now
    ├── config/db.ts      the PrismaClient singleton
    ├── constants/        copy verbatim
    └── utils/
        ├── api/          copy verbatim
        └── errors/       copy verbatim
```

Add Postgres to the root `docker-compose.yml` beside the two Redis services:

```yaml
  postgres:
    image: postgres:16
    container_name: ecommerce-postgres
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: shopymart
      POSTGRES_PASSWORD: shopymart
      POSTGRES_DB: shopymart
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

`config/db.ts` — one client for the whole process (a new client per request exhausts the pool):

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
    log: NODE_ENV === "production" ? ["warn", "error"] : ["query", "warn", "error"],
});
```

**Checkpoint:** `docker compose up -d postgres`, then `psql -h localhost -U shopymart -d shopymart -c '\l'`
lists your database, and `curl localhost:5001/health` returns 200.

---

## Phase 1 — Schema and migrations ⭐ *the important one*

**Goal:** all 15 tables designed together, in one migration.

Do the whole schema in one pass. Relations and enums designed together come out coherent; bolted on
one table at a time they don't.

**Tables:** `users`, `sessions`, `verification_links`, `addresses`, `categories`, `sub_categories`,
`brands`, `products`, `product_variants`, `product_images`, `carts`, `cart_items`, `wishlist_items`,
`promos`, `orders`, `order_items`, `banners`.

**Enums** (real Postgres enums): `user_role`, `auth_provider`, `product_size`, `product_status`,
`upload_status`, `order_status`, `payment_status`, `cancelled_by`, `verification_link_type`.

A shape to follow — note what the Mongo version couldn't enforce:

```prisma
model Product {
  id          String          @id @default(uuid()) @db.Uuid
  title       String
  description String
  price       Int             // paise
  salesPercentage Int         @default(0)
  status      ProductStatus   @default(active)

  categoryId    String        @db.Uuid
  category      Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  brandId       String        @db.Uuid
  brand         Brand         @relation(fields: [brandId], references: [id], onDelete: Restrict)
  subCategoryId String?       @db.Uuid
  subCategory   SubCategory?  @relation(fields: [subCategoryId], references: [id], onDelete: SetNull)

  variants    ProductVariant[]
  images      ProductImage[]
  createdAt   DateTime        @default(now()) @db.Timestamptz(3)

  @@index([status, createdAt(sort: Desc)])
  @@index([status, price])
  @@index([categoryId, status])
  @@index([brandId, status])
}

model ProductVariant {
  id        String       @id @default(uuid()) @db.Uuid
  productId String       @db.Uuid
  product   Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  color     String?
  size      ProductSize?
  stock     Int          @default(0)

  // The database now enforces what application code had to guarantee in Mongo:
  @@unique([productId, color, size])   // one row per sellable combination
}
```

Then add a `CHECK (stock >= 0)` by hand — the last line of defence against an oversell bug.

**After `npx prisma migrate dev --name init`, open the generated `.sql` and read it.** Then hand-add
what Prisma can't express:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX products_title_trgm_idx ON products USING gin (title gin_trgm_ops);

CREATE UNIQUE INDEX brands_name_lower_idx ON brands (lower(name));
CREATE UNIQUE INDEX categories_name_lower_idx ON categories (lower(name));

ALTER TABLE product_variants ADD CONSTRAINT stock_not_negative CHECK (stock >= 0);
```

**Checkpoint:** `\d products` in psql shows your columns, FKs and indexes. Try to break it on
purpose — insert a product with a non-existent `brandId`, insert two variants with the same
(product, colour, size), set a stock to `-1`. All three must be refused. **That's the payoff of a
relational database, and it's worth feeling it directly.**

---

## Phase 2 — Auth

**Goal:** register → verify → login → refresh → logout, working in the real client.

Everything else needs a user, so this comes first.

- **Copy verbatim:** `utils/auth/*` (jwt, bcrypt, cookies, verificationToken),
  `middleware/authenticate.ts`, `middleware/requireAdmin.ts`, `routes/auth.route.ts`,
  `routes/session.route.ts`, `controllers/auth.controller.ts`, `controllers/session.controller.ts`.
- **Rewrite:** `services/auth.service.ts` — the same functions with Prisma queries.

Keep every security property already built into the Mongo version:
refresh-token rotation with reuse detection, the dummy-hash compare for unknown emails, hashed
verification tokens, `revokeSessions` clearing the session cache.

**Checkpoint:** register in the browser, click the emailed link, log in, and confirm in psql:

```sql
SELECT email, verified, auth_provider FROM users;
SELECT id, user_id, refresh_jti, expires_at FROM sessions;
```

---

## Phase 3 — Redis and rate limiting

**Goal:** auth endpoints protected.

Pure copy-paste: `utils/rateLimiter/*`, `config/redis.ts`, `config/rateLimiter.ts`,
`middleware/rateLimiter.ts`, `middleware/visitorId.ts`. None of it knows what database you use.

**Checkpoint:** 11 bad logins in a row returns 429.

---

## Phase 4 — Catalog ⭐ *the most SQL*

**Goal:** the storefront lists, filters, sorts and paginates products.

- **Copy verbatim:** `routes/product.route.ts`, `routes/catalog.route.ts`, and both controllers.
- **Rewrite:** `services/catalog.service.ts`, `services/product.service.ts`.

The listing query is where Postgres earns its place. Filters, sort, pagination and a total, in one
service function:

```ts
const where: Prisma.ProductWhereInput = {
    ...(search && { title: { contains: search, mode: "insensitive" } }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(size && { variants: { some: { size } } }),     // a JOIN, not a second query
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

**Practise here:** run it through `EXPLAIN ANALYZE` with and without your indexes. Watch a
`Seq Scan` become an `Index Scan`, and watch the trigram index change what a `%search%` costs. This
is the single most useful hour in the whole plan.

**Checkpoint:** the storefront browses, filters and paginates. `EXPLAIN ANALYZE` shows index scans.

---

## Phase 5 — Jobs

**Goal:** product images and emails work.

Copy `jobs/**` wholesale, plus `utils/cloudinary.ts`, `utils/imageProcessor.ts`,
`utils/email/**`, `middleware/upload.ts`. The only change is inside the image processor: its two
`ProductModel` writes become Prisma calls.

**Checkpoint:** upload product images in the admin panel; watch the job in Bull Board; see rows
appear in `product_images`.

---

## Phase 6 — Cart and wishlist

**Goal:** add to cart, update quantity, wishlist toggle, and the guest `/sync` endpoints.

Where Mongo pushed into an embedded array, you now `upsert` into `cart_items` with a composite
unique key `(cart_id, product_id, color, size)`:

```ts
await prisma.cartItem.upsert({
    where: { cartId_productId_color_size: { cartId, productId, color, size } },
    update: { quantity: { increment: quantity } },
    create: { cartId, productId, color, size, quantity },
});
```

That one constraint replaces the hand-written "is this the same line?" comparison in three places
of the Mongo code.

**Checkpoint:** add the same product in two colours — two rows. Add it twice in one colour — one row,
quantity 2.

---

## Phase 7 — Checkout, orders, payments ⭐ *the hard one*

**Goal:** a payment that decrements stock exactly once.

Copy the controllers and routes; rewrite `services/checkout.service.ts` and `order.service.ts`.

The one function that matters, `fulfillPaidOrder`:

```ts
await prisma.$transaction(async (tx) => {
    // Idempotency: re-read INSIDE the transaction. A second confirm (double-click, retry,
    // webhook arriving late) must change nothing.
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "paid") return;

    for (const item of order.items) {
        // The oversell guard: the WHERE clause is the lock. If stock dropped below the quantity
        // between the check and here, count is 0 and the whole transaction rolls back.
        const { count } = await tx.productVariant.updateMany({
            where: { productId: item.productId, color: item.color, size: item.size,
                     stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
        });
        appAssert(count > 0, BAD_REQUEST, "One or more products are out of stock");
    }

    if (order.promoCode) {
        const { count } = await tx.promo.updateMany({
            where: { code: order.promoCode, count: { gt: 0 } },
            data: { count: { decrement: 1 } },
        });
        appAssert(count > 0, BAD_REQUEST, "Promo code is no longer available");
    }

    await tx.cartItem.deleteMany({ where: { cartId, productId: { in: purchasedIds } } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "paid", ... } });
});
```

**Two rules, both learned the hard way in the Mongo version:**

1. **Razorpay calls stay outside the transaction.** An interactive transaction holds a connection
   and times out (default 5s); a gateway call inside it will eventually blow up under load.
2. **The webhook calls this same function.** A customer who closes the tab after paying still gets
   their order, and because the function is idempotent, the webhook and the browser can both run it.

**Checkpoint — the test worth doing:** set a variant's stock to 1, then fire two confirms at once
from two terminals. Exactly one must succeed; stock must end at 0, never -1. Then check
`SELECT stock FROM product_variants WHERE id = …`.

---

## Phase 8 — Cache

Copy `utils/cache/**` unchanged. The invalidation design carries over exactly: versioned namespaces
for listings, per-product keys for detail pages, a separate `facets` version.

**Checkpoint:** hit a product page twice — the second is a cache hit. Edit that product — its cache
entry is gone, and another product's is not.

---

## Phase 9 — Dashboard ⭐ *pure SQL*

**Goal:** the admin dashboard, written as SQL instead of aggregation pipelines.

This is the best SQL practice in the project. Use `$queryRaw`:

```ts
const revenueByDay = await prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
    SELECT date_trunc('day', paid_at) AS day,
           sum(total_amount)          AS revenue,
           count(*)                   AS orders
    FROM orders
    WHERE payment_status = 'paid' AND paid_at >= now() - ${days}::int * interval '1 day'
    GROUP BY day
    ORDER BY day;
`;
```

Then try the ones Mongo made awkward: top products with a `LATERAL` join, period-over-period change
with `LAG()`, counts of several statuses in one pass with `count(*) FILTER (WHERE …)`.

**Checkpoint:** the admin dashboard renders the same numbers as the Mongo one, from the same data.

---

## Phase 10 — Operations

**Goal:** it survives a deploy and cleans up after itself.

- **Graceful shutdown** — copy it, and add `await prisma.$disconnect()`.
- **`/health`** — `SELECT 1` against Postgres plus the Redis ping.
- **The cleanup job — this one is new.** Mongo's TTL indexes deleted expired sessions, spent
  verification links and old cancelled orders automatically. **Postgres has no TTL.** Add a BullMQ
  repeatable job, hourly, with a **fixed job id** (so several instances schedule it once), deleting
  in **batches** of a few thousand rows until a pass removes nothing.

  For sessions and links this is housekeeping — queries already ignore expired rows. For cancelled
  orders it keeps a promise the UI makes to customers ("this order will be removed at …").

  Full design, the MVCC/autovacuum lesson, and the delete-or-hide choice for cancelled orders are in
  `architect/phase-10-operations.md`.

---

## Gotchas that will bite

| | |
|---|---|
| **No TTL** | Phase 10's cleanup job. Housekeeping for sessions and links; a user-visible promise for cancelled orders. |
| **Transaction timeouts** | Interactive transactions default to ~5s and hold a connection. No HTTP calls inside them. |
| **Connection pool** | API and BullMQ workers share it. Set `connection_limit` in `DATABASE_URL` deliberately. |
| **`migrate dev` vs `migrate deploy`** | `dev` can reset your database. Production uses `deploy`. |
| **Enums need migrations** | Adding an order status is a schema change, not a code change. |
| **`Decimal`/`BigInt` in JSON** | `count(*)` comes back as `BigInt` and `JSON.stringify` throws on it. Convert before responding. |
| **Cascade deletes** | `onDelete` is now the database's decision. Decided per relation in phase 01: product → order items is `SetNull` (the line keeps its snapshot), user → orders is `Restrict`. Never `Cascade` into orders. |

---

## Finish checklist

Work through your own route list and tick each one off against the Mongo backend. Group by area:

- **auth** — register, verify, resend, login, google, refresh, logout, me (get/patch), avatar, password
- **session** — list, revoke
- **products** — list, detail, facets; admin create/update/delete, image upload/delete/cover/colour
- **catalog** — categories, sub-categories, brands (public reads + admin writes)
- **cart** — get, add, update, delete, clear, sync
- **wishlist** — get, add, toggle, remove, sync
- **checkout** — create-session, resume-session, confirm, points, pay-with-points
- **orders** — list, cancel, return; admin list and status update
- **promos** — active, apply; admin CRUD
- **settings** — banners list, upload, delete
- **dashboard** — lite, full
- **webhooks** — razorpay
- **health**

For each: same path, same status code, same response shape. The fastest check is to run both
backends and diff the JSON.

---

## Suggested pace

| Phase | Rough effort |
|---|---|
| 0–1 Skeleton + schema | A solid day — worth taking slowly, everything rests on it |
| 2–3 Auth + rate limiting | A day |
| 4 Catalog | A day, plus an hour on `EXPLAIN ANALYZE` |
| 5–6 Jobs + cart | A day |
| 7 Checkout | A day — go carefully, it handles money |
| 8–10 Cache + dashboard + ops | A day |

Start at phase 0 and don't skip ahead: phase 7 is only safe because phase 1 gave it the constraints
to lean on.
