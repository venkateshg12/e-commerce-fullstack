# Phase 08 — Checkout, orders and payments ⭐

**Goal:** a Razorpay payment that decrements stock **exactly once**, whether the customer comes
back to confirm, the webhook arrives, or both at once. Plus cancel, return, points, and the admin
order list.

**Why now:** everything it needs exists: users, products with stock, cart, addresses, jobs.

**This phase handles money. Take it slowly.**

---

## Prerequisites
- Phases 05–07 done
- The phase-2 spike proved **row 2** (a conditional update that returns a row count) and **row 4**
  (a transaction that rolls back on throw). Don't start this phase until both are proven.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in the env schema. Make the
  webhook secret **required in production** with a Zod `.superRefine`, as `mongo/src/index.ts`
  refuses to start without it.

## Files

**Copy verbatim:** `mongo/src/utils/razorpay.ts` (client + signature verification).

**Create**
```
src/modules/checkout/   checkout.module.ts, checkout.controller.ts, checkout.service.ts,
                        fulfilment.service.ts   (fulfillPaidOrder, alone in its own service)
src/modules/orders/     orders.module.ts, orders.controller.ts, admin-orders.controller.ts, orders.service.ts
src/modules/webhooks/   webhooks.module.ts, razorpay-webhook.controller.ts
```

## The shape of it

Three entry points, **one** fulfilment function:
```
POST /checkout/create-session   price the cart server-side, create the order (pending), create a Razorpay order
POST /checkout/confirm          browser returns with a signature  ─┐
POST /webhooks/razorpay         Razorpay tells us directly        ─┴→ FulfilmentService.fulfillPaidOrder()
```

`FulfilmentService` is its own provider, so both `CheckoutModule` and `WebhooksModule` can use it
(export it from `CheckoutModule`). `fulfillPaidOrder(orderId, paymentId)` is **one transaction**,
and it's **idempotent**:

1. **Re-read the order inside the transaction.** If it's already paid, return. That one step makes
   a double-click, a retry and a late webhook all safe.
2. For each line: **conditional stock decrement** (`WHERE stock >= quantity`). If the count is 0,
   throw `AppError(BAD_REQUEST, "One or more products are out of stock")`, and the whole
   transaction rolls back.
3. If there's a promo: the same conditional decrement on the promo's remaining count.
4. Delete the bought lines from the cart.
5. Mark the order paid (`paidAt`, `paymentId`, status `placed`).
6. **After commit:** invalidate the product-detail cache for the products bought (phase 10), and
   enqueue the confirmation email.

The full pseudo-code is in `../postgres/architect/phase-07-checkout-orders.md`. Rewrite it with the
exact Prisma 8 calls from your `SPIKE.md`.

## Rules that came from real bugs — keep all four
1. **Never call Razorpay inside the transaction.** Verify the signature, fetch the payment, check
   the amount and capture status. **Then** open the transaction.
2. **Verify before you trust:** a timing-safe signature compare, the payment belongs to this order,
   the amount equals the stored total, the status is `captured`.
3. **The webhook is not optional.** A customer who closes the tab after paying still gets their
   order.
4. **Returns are a transaction too.** Claim the status with a conditional update first (so two
   concurrent returns can't both restock), then restock and credit points.

## The webhook in Nest

```ts
@Public()
@SkipRateLimit()
@Controller("webhooks")
export class RazorpayWebhookController {
    @Post("razorpay")
    @HttpCode(200)
    async handle(@Req() req: RawBodyRequest<Request>, @Headers("x-razorpay-signature") signature: string) {
        appAssert(req.rawBody && verifyWebhookSignature(req.rawBody, signature), BAD_REQUEST, "Invalid signature");
        await this.webhooks.handle(JSON.parse(req.rawBody.toString("utf8")));
        return { received: true };
    }
}
```
- `rawBody: true` was set in `main.ts` in phase 0. Nest keeps the exact bytes on `req.rawBody`
  **and** still parses JSON for every other route. That replaces "mount the webhook before
  `express.json()`".
- Always answer 200 once the event is handled, including "already paid". Otherwise Razorpay keeps
  retrying.

## Steps
1. `createSession`: validate the cart, **price every line from the database** (never the request),
   apply the promo, create the order + lines with the snapshot fields, then call Razorpay. If
   Razorpay fails, mark the order failed. No money has moved.
2. `resumeSession`, `confirm`, the webhook, all ending in `fulfillPaidOrder`.
3. Points: `GET /checkout/points` and `POST /checkout/pay-with-points` (the same transaction pattern,
   with points instead of Razorpay).
4. Orders: the customer's list, cancel (unpaid only, check with Razorpay first), return (delivered,
   7 days). Admin: a paginated `/admin/orders` (`Paginated`) and `PATCH /orders/:orderId/status`
   with `@Roles("admin")`.

## NestJS you're practising
`RawBodyRequest` · `@HttpCode` · `@Headers()` · a shared provider exported to two modules · keeping
external I/O out of transactional code

## Tests: the ones that matter
- **Concurrency (e2e, docker Postgres):** set a variant's stock to 1, fire two `confirm` calls with
  `Promise.all` → exactly one succeeds, stock is 0 (never −1), the order is paid once.
- **Idempotency:** call `fulfillPaidOrder` twice → the second changes nothing.
- **Webhook:** replay the same payload twice → both 200, one fulfilment. A bad signature → 400.
- **Pricing:** a request body carrying a price → ignored, the stored total comes from the database.
- Mock the Razorpay client in tests (override the provider). Never call the real API from CI.

## Checkpoint
A full purchase in the browser with Razorpay test keys. Then, from two terminals, the concurrent
confirm from the tests above against your running app. Then `SELECT stock …` on the Neon branch.

## Pitfalls
- **`count === 0` is a failure,** not a no-op. Assert on it every time.
- **Transaction timeouts:** keep the transaction short, with everything slow outside it.
- **Money is `Int` paise.** No floats anywhere near a total.

## Done when
- [ ] Create → pay → confirm works in the browser
- [ ] The concurrency, idempotency and webhook-replay tests pass and stay in the suite
- [ ] Cancel, return, points and admin order routes match the Mongo backend
