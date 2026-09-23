# Phase 07 — Cart, wishlist and addresses

**Goal:** add to cart, change quantity, remove, clear, wishlist add/toggle/remove, the guest
`/sync` endpoints that merge a logged-out visitor's bag at sign-in, and address CRUD.

**Why now:** checkout reads the cart and the address.

---

## Prerequisites
- Phase 05 done (products and variants exist)

## Files
```
src/modules/cart/       cart.module.ts, cart.controller.ts, cart.service.ts
src/modules/wishlist/   wishlist.module.ts, wishlist.controller.ts, wishlist.service.ts
src/modules/addresses/  addresses.module.ts, addresses.controller.ts, addresses.service.ts
```
None of these routes is `@Public()`. They're behind the global `AuthGuard` automatically, the same
as `mongo/src/routes/cart.route.ts` applying `authenticate` to all of `/cart`. Add
`@RateLimit(limits.protectedApi)` at the class level.

## Sharing product lookups without coupling modules

The cart needs "is this product active, does this colour/size exist, how much stock is there?"
Don't inject `ProductsService` wholesale (that invites a cycle once products need cart data). Have
`ProductsModule` **export** one small, read-only service:

```ts
@Injectable()
export class ProductLookupService {
    findSellable(ids: string[]): Promise<SellableProduct[]>   // one query, variants included
}
// products.module.ts
exports: [ProductLookupService]
// cart.module.ts
imports: [ProductsModule]
```
If you ever need `forwardRef()` between two feature modules, stop. The shared piece belongs in a
module both of them import.

## The constraint that replaces hand-written logic

Same design as `../postgres/architect/phase-06-cart-wishlist.md`: a unique key on
`(cart_id, product_id, color, size)`, and adding to the cart is **one upsert** (spike row 3) that
increments the quantity on conflict. It can't race, and it replaces the three places the Mongo code
compared lines by hand.

> **The `NULL` trap.** In SQL, `NULL ≠ NULL`, so two "no colour" lines for the same product
> don't collide on the unique index. Decide now: store `''` for "no colour/size", or use a unique
> index on `coalesce(color,'')`. Test a product with no colours explicitly.

## Steps
1. `getCart`: lines joined to their product, with the available stock per line.
2. `addToCart`: validate via `ProductLookupService` (active, colour/size exist, quantity ≤ stock),
   then upsert.
3. `updateQuantity`: the quantity is absolute, and `0` removes the line.
4. `syncCart`: up to 100 guest lines (the shared Zod schema caps it). Fetch every referenced product
   in **one** query, then upsert each, all inside one transaction.
5. Wishlist: unique `(user_id, product_id)`. Toggle = delete if present, else insert. Sync is capped
   at 200 ids.
6. Addresses: CRUD scoped to `@CurrentUser()`. Keep the Mongo rule that deleting the default address
   makes the first remaining one the default (`mongo/src/services/address.service.ts`), inside a
   transaction. **Every query filters by `userId`.** Updating `/address/:id` for someone else's
   address must be a 404, not a success.

## NestJS you're practising
Exporting a narrow provider from a module · avoiding circular module dependencies · class-level
decorators for a whole controller · `@CurrentUser()` scoping every query

## Tests
- `cart.service.spec.ts` with a fake `ProductLookupService`: out-of-stock → `AppError` and no
  upsert. Quantity 0 → delete.
- e2e: the same product in two colours makes two lines, and twice in one colour makes one line with
  quantity 2. The no-colour product case. Sync merges into an existing cart.
- e2e (authorisation): user B can't read, update or delete user A's address (404).

## Checkpoint
- Add to cart while logged out (it goes to `localStorage`), then log in → the lines appear in the
  database, and the cart page shows them.
- Ask for more than the stock → 400, and no row is written.

## Pitfalls
- **Trusting ids from the body without the user filter.** Every `where` includes `userId`.
- **N+1 in sync:** one product query per line. Batch it.
- **Stock is checked twice:** at add time (for the UI) and again at checkout (for correctness).
  Both are needed.

## Done when
- [ ] Every cart, wishlist and address route matches the Mongo backend
- [ ] The guest cart and wishlist merge on login
- [ ] The `NULL` case is decided, and tested
- [ ] No module imports another module's service except through an explicit export
