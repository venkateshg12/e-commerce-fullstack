# Phase 06 — Cart and wishlist

**Goal:** add to cart, change quantity, remove, clear, wishlist toggle, and the guest `/sync`
endpoints that merge a logged-out visitor's bag at sign-in.

**Why now:** checkout reads the cart. This is also the clearest example of a constraint replacing
hand-written logic.

---

## Prerequisites
- Phase 04 (products and variants)

## Files
**Copy verbatim:** `routes/cart.route.ts`, `routes/wishlist.route.ts`, both controllers.
**Rewrite:** `services/cart.service.ts`, `services/wishlist.service.ts`.

## The interesting part

In Mongo a cart was one document with an embedded `items[]`, and three separate places compared
`(product, color, size)` by hand to decide "is this the same line?". In Postgres that comparison
becomes a constraint:

```prisma
model CartItem {
  cartId    String  @db.Uuid
  productId String  @db.Uuid
  color     String?
  size      ProductSize?
  quantity  Int
  @@unique([cartId, productId, color, size])
}
```

and adding to the cart becomes one statement that can't race:

```ts
await prisma.cartItem.upsert({
    where: { cartId_productId_color_size: { cartId, productId, color, size } },
    update: { quantity: { increment: quantity } },
    create: { cartId, productId, color, size, quantity },
});
```

> **`NULL` is not equal to `NULL` in SQL.** A product with no colour stores `color = NULL`, and two
> such rows do **not** collide on the unique index. Either store `''` instead of `NULL` for "no
> colour", or add a unique index on `(cart_id, product_id, coalesce(color,''), coalesce(size,''))`.
> Decide this here — it's the one place this phase can quietly go wrong.

## Steps
1. `getCart` returns lines joined to their product, with the per-line available stock
   (`variants.stock` for that colour+size) so the UI can show "only 2 left".
2. `addToCart`: validate the product is active, the colour/size exist, and the requested quantity
   fits the variant's stock; then upsert.
3. `updateQuantity`: quantity is absolute, and `0` removes the line.
4. `syncCart`: take up to 100 guest lines, fetch every referenced product in **one** query, then
   upsert each. (The Mongo version originally ran one query per line — don't reproduce that.)
5. Wishlist is the same shape but simpler: `@@unique([userId, productId])`, and toggle = delete if
   present else insert.

## Postgres you're practising
Composite unique keys · `upsert` / `ON CONFLICT DO UPDATE` · `NULL` semantics in unique indexes ·
`IN (...)` batch fetching instead of N+1

## Checkpoint
```sql
-- same product, two colours → two rows
-- same product, same colour, twice → one row, quantity 2
SELECT product_id, color, size, quantity FROM cart_items WHERE cart_id = '<id>';
```
- Add to cart while logged out (it goes to `localStorage`), then log in → the lines appear in the
  database and the client's cart shows them.
- Ask for more than stock → 400, and no row is written.

## Pitfalls
- **The `NULL` trap above.** Test a product with no colours explicitly.
- **Stock is checked at add time and again at checkout.** Both are needed: the first is UX, the
  second is correctness.
- Cap the sync arrays (100 items / 200 wishlist ids) — the shared Zod schema already does.

## Done when
- [ ] Add, update, remove, clear all work from the UI
- [ ] The same product in two colours is two lines; twice in one colour is one line
- [ ] Guest cart and wishlist merge on login
- [ ] A product with no colour/size behaves correctly in the cart
