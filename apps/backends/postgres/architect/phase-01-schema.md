# Phase 01 — Schema and migrations ⭐

**Goal:** every table in the system, designed in one pass, with the constraints that make later
phases safe.

**Why now:** phase 7 (payments) is only safe because the database refuses bad data. Design the whole
thing together — relations and enums bolted on one table at a time come out incoherent.

**This is the most important phase in the plan. Take your time.**

---

## Prerequisites
- Phase 00 done
- `apps/backends/mongo/src/models/*.model.ts` open beside you — that is the source of truth for
  fields

## What to model

**17 tables.** Group them so you can work in order:

| Group | Tables |
|---|---|
| Identity | `users`, `sessions`, `verification_links`, `addresses` |
| Catalog | `categories`, `sub_categories`, `brands`, `products`, `product_variants`, `product_images` |
| Shopping | `carts`, `cart_items`, `wishlist_items` |
| Commerce | `promos`, `orders`, `order_items` |
| Content | `banners` |

**Enums** (make them real Postgres enums, not strings): `user_role`, `auth_provider`,
`product_size`, `product_status`, `upload_status`, `order_status`, `payment_status`, `cancelled_by`,
`verification_link_type`.

## The decisions to make now (changing them later means migrating data)

### 1. Money → `Int`, in paise. Never `Float`/`double`.

Store every price, total, discount and refund as a whole number of paise: ₹499.50 is `49950`.

**Why not `double`:** floating point can't represent most decimals exactly. Try it:
```sql
SELECT 0.1::float8  + 0.2::float8  = 0.3::float8;    -- false (0.30000000000000004)
SELECT 0.1::numeric + 0.2::numeric = 0.3::numeric;   -- true
```
With floats, totals drift and equality checks fail — and checkout compares the gateway amount
against the stored total, so a legitimate payment could be rejected.

**Why integer paise is enough:** Razorpay itself works in whole paise. Amounts you send and receive
are integers in the smallest unit, so a fraction of a paisa never reaches the gateway.

**When a calculation produces fractions** (percentage discounts now, GST or fees later): compute
exactly, then **round once at a defined point** — per line or per invoice — and store the rounded
integer. Rounding is a business rule you choose, not an accident of floating point.

| Type | Prisma | Use it for |
|---|---|---|
| Integer paise ✅ | `Int` | Everything that is charged or stored as money |
| Exact decimal | `Decimal @db.Decimal(12, 2)` | Only if you prefer `499.50` in the table (returns a `Decimal` object — convert before JSON) |
| ~~`Float`~~ ❌ | ~~`Float`~~ | Never for money |

Convert at the edges only: rupees ↔ paise when talking to the client, never inside calculations.

### 2. IDs → `uuid` with `gen_random_uuid()`
No extension needed on PG13+.

### 3. Timestamps → `timestamptz`, never `timestamp`
Store UTC, render locally.

### 4. Order lines keep a snapshot
`order_items` stores `title`, `image`, `unit_price`, `color`, `size` **at purchase time**. An order
must still read correctly after the product is edited — or deleted (see `SetNull` below).

Orders store the **promo code as text, not a foreign key**: deleting a promo must never touch the
orders that used it.

### 5. `onDelete` — what happens to child rows when a parent row is deleted

| Rule | Effect on the child rows |
|---|---|
| `Cascade` | Deleted along with the parent |
| `Restrict` | The parent delete is **refused** while children exist |
| `SetNull` | Kept, with the reference set to `NULL` (the column must be nullable) |

For this schema — each choice matches what the Mongo code already enforces by hand:

| Parent → child | Rule | Why |
|---|---|---|
| user → sessions, addresses, carts, wishlist items, verification links | `Cascade` | Meaningless without the user |
| user → **orders** | **`Restrict`** | Never lose order history. To remove a user, anonymise them instead |
| product → variants, images | `Cascade` | Part of the product |
| product → cart items, wishlist items | `Cascade` | A deleted product shouldn't linger in carts |
| product → **order items** | **`SetNull`** | The line survives with `product_id = NULL`, reading from its snapshot. The client already handles this: `toOrderLines` returns `productId: null` and labels the line |
| category → products | `Restrict` | Mongo's `assertUnused` refuses this today |
| brand → products | `Restrict` | Same |
| sub-category → products | `Restrict` | Same |
| category → sub-categories | `Cascade` | Mongo deletes a category's types with it |
| order → order items | `Cascade` | Part of the order |
| cart → cart items | `Cascade` | Part of the cart |

**Never `Cascade` from a product or user into orders.** One admin click would erase sales history.

The gain over Mongo: `assertUnused` could be bypassed by a new code path. A foreign key can't.

## Steps

1. **Write all of `schema.prisma` in one sitting.** Models, enums, relations, `@@unique`, `@@index`.
2. **The constraint that matters most** — one stock row per sellable combination:
   ```prisma
   model ProductVariant {
     productId String       @db.Uuid
     color     String?
     size      ProductSize?
     stock     Int          @default(0)
     @@unique([productId, color, size])
   }
   ```
   In Mongo this was enforced by hand in `assertVariantsMatchOptions`. Now the database does it.
3. **Index for the queries phase 4 will run**, not for the tables in the abstract:
   `products(status, created_at DESC)`, `products(status, price)`, `products(category_id, status)`,
   `products(brand_id, status)`, `orders(user_id, created_at DESC)`,
   `sessions(user_id)`, `verification_links(token)` unique.
4. **`npx prisma migrate dev --name init`**
5. **Open `prisma/migrations/*/migration.sql` and read every line.** This is the phase's real
   exercise. You should be able to explain each `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE … ADD
   CONSTRAINT` and `CREATE INDEX`.
6. **Hand-add what Prisma can't express.** Create an empty migration
   (`npx prisma migrate dev --create-only --name hand_written_indexes`) and write SQL into it:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX products_title_trgm_idx ON products USING gin (title gin_trgm_ops);

   CREATE UNIQUE INDEX brands_name_lower_idx      ON brands     (lower(name));
   CREATE UNIQUE INDEX categories_name_lower_idx  ON categories (lower(name));

   ALTER TABLE product_variants ADD CONSTRAINT stock_not_negative CHECK (stock >= 0);
   ALTER TABLE order_items      ADD CONSTRAINT quantity_positive  CHECK (quantity > 0);
   ```
7. **Seed a little data by hand in psql** — two categories, two brands, three products with
   variants. You need rows to look at in phase 4.

## Postgres you're practising
Enums · foreign keys and referential actions · composite unique constraints · `CHECK` constraints ·
B-tree vs GIN · functional indexes (`lower(name)`) · `timestamptz` · reading real DDL

## Checkpoint — try to break it
In `psql`, every one of these must be **refused**:
```sql
INSERT INTO products (id, title, brand_id, ...) VALUES (gen_random_uuid(), 'x', gen_random_uuid(), ...);
-- FK violation: that brand doesn't exist

INSERT INTO product_variants (product_id, color, size, stock) VALUES ('<id>', 'red', 'M', 5);
INSERT INTO product_variants (product_id, color, size, stock) VALUES ('<id>', 'red', 'M', 3);
-- unique violation: one row per (product, colour, size)

UPDATE product_variants SET stock = -1 WHERE id = '<id>';
-- check violation

INSERT INTO brands (id, name) VALUES (gen_random_uuid(), 'NIKE');   -- with 'Nike' present
-- unique violation on lower(name)

DELETE FROM products WHERE id = '<a product in an order>';
-- allowed — and the order line survives with product_id = NULL and its snapshot intact:
SELECT product_id, title, unit_price FROM order_items WHERE order_id = '<that order>';

DELETE FROM users WHERE id = '<a user with orders>';
-- refused (Restrict)

DELETE FROM brands WHERE id = '<a brand with products>';
-- refused (Restrict)
```
Also: `\d products` shows your indexes, and `\dT+` lists your enums.

## Pitfalls
- **`migrate dev` can reset the database.** Fine now, never in production (`migrate deploy` there).
- **Enums are schema, not code.** Adding an order status later is a migration.
- **Don't nullable-everything.** `NOT NULL` is documentation the database enforces.

## Done when
- [ ] All 17 tables and 9 enums exist
- [ ] You have read the generated `migration.sql` end to end and can explain it
- [ ] The trigram index, both `lower(name)` uniques and both `CHECK`s are applied
- [ ] Every "must be refused" statement above is refused
- [ ] Deleting an ordered product leaves the order line intact with `product_id = NULL`
- [ ] Every money column is `Int` (paise) — no `Float` anywhere in the schema
- [ ] A handful of seed rows exist to work with
