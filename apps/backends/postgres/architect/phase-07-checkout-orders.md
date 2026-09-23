# Phase 07 — Checkout, orders and payments ⭐

**Goal:** a payment that decrements stock **exactly once**, and an order that survives every way the
customer can misbehave (double-click, close the tab, pay twice, cancel mid-payment).

**Why now:** it needs everything before it. Go slowly — this handles money.

---

## Prerequisites
- Phases 04 and 06
- Razorpay test keys, including `RAZORPAY_WEBHOOK_SECRET`

## Files
**Copy verbatim:** `routes/checkout.route.ts`, `routes/order.route.ts`, `routes/webhook.route.ts`,
and all three controllers. `utils/razorpay.ts`, `utils/currency.ts`.
**Rewrite:** `services/checkout.service.ts`, `services/order.service.ts`.

## The shape of it

Three entry points, **one** fulfilment function:

```
POST /checkout/create-session   build the order, ask Razorpay for a payment order
POST /checkout/confirm          browser returns with a signature  ─┐
POST /webhooks/razorpay         Razorpay tells us directly        ─┴→ fulfillPaidOrder()
```

`fulfillPaidOrder(orderId, paymentId)` is one transaction and is **idempotent**:

```ts
await prisma.$transaction(async (tx) => {
    // Re-read INSIDE the transaction. This single line is what makes a double-click,
    // a retry, and a late webhook all safe.
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentStatus === "paid") return;

    for (const item of order.items) {
        // The WHERE clause IS the oversell guard: if stock fell below the quantity since
        // checkout began, count is 0 and the whole transaction rolls back.
        const { count } = await tx.productVariant.updateMany({
            where: {
                productId: item.productId, color: item.color, size: item.size,
                stock: { gte: item.quantity },
            },
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

    await tx.cartItem.deleteMany({ where: { cartId: order.cartId, productId: { in: ids } } });
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "paid", orderStatus: "placed", paidAt: new Date(), paymentId } });
});
```

## Rules that came from real bugs — keep all four

1. **Never call Razorpay inside the transaction.** An interactive transaction holds a connection and
   times out (~5s by default). Verify the signature, fetch the payment, check amount and capture —
   **then** open the transaction.
2. **Verify before you trust:** signature (timing-safe compare), the payment belongs to this order,
   the amount matches what you stored, the status is `captured`.
3. **The webhook is not optional.** Without it, a customer who closes the tab after paying leaves
   money captured against an order that never completes. Mount it **before** `express.json()` with
   `express.raw` — the signature covers the exact bytes.
4. **Returns are a transaction too:** restock, credit points, flip the status — all or nothing, and
   claim the status with a conditional update first so two concurrent returns can't both restock.

## Steps
1. `createCheckoutSession`: validate the cart, price it server-side (never trust client prices),
   apply the promo, create the order rows (`pending_payment`), call Razorpay, return its order id.
2. `fulfillPaidOrder` as above.
3. `confirm`: verify everything, then call it.
4. The webhook: verify the signature, look the order up by `razorpayOrderId`, call it, always
   answer 200 once handled.
5. `cancelOrder` (unpaid only, check with Razorpay first) and `returnOrder` (delivered, 7 days).
6. Orders list for the customer and, paginated, for the admin.

## Postgres you're practising
Transactions · `UPDATE … WHERE stock >= n` as a lock-free guard · `SELECT … FOR UPDATE` (try it as
an alternative and compare) · isolation levels: try `Serializable` on the fulfilment and see what
changes · idempotency

## Checkpoint — the test that matters
```sql
UPDATE product_variants SET stock = 1 WHERE id = '<variant>';
```
Then fire two confirms at the same order simultaneously (two terminals, `&`):
- exactly **one** succeeds
- `SELECT stock FROM product_variants WHERE id = '<variant>';` → **0**, never `-1`
- the order is `paid` exactly once, with one `paymentId`

Then: replay the webhook payload twice → the second changes nothing and still answers 200.

## Pitfalls
- **Prices come from the database, never the request.** A client that can send its own price can
  buy for ₹1.
- **`count === 0` is a real failure**, not a no-op — assert on it every time.
- **Transaction timeouts** under load: keep the transaction short, everything slow outside it.
- **Money is `Int` paise** — no floats anywhere near a total.

## Done when
- [ ] A test-mode payment completes end to end and stock drops correctly
- [ ] The concurrency test above passes
- [ ] Replaying the webhook is a no-op
- [ ] Cancel (unpaid) and return (delivered, within 7 days) both work and restock correctly
