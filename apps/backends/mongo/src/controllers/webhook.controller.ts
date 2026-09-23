import crypto from "crypto";
import { Request, Response } from "express";
import { OK, BAD_REQUEST } from "../constants/https";
import { OrderModel } from "../models/order.model";
import { fulfillPaidOrder } from "../services/checkout.service";
import { toSubUnits } from "../utils/currency";
import { RAZORPAY_WEBHOOK_SECRET } from "../constants/env";

/*
  Razorpay's own notification that a payment was captured.

  Without it a payment is only ever applied by the browser calling /checkout/confirm, so a customer
  who pays and then closes the tab leaves money captured at the gateway against an order that stays
  `pending_payment` for ever — stock never decremented, nobody told. This arrives server-to-server
  and doesn't care what the browser did.

  Nothing here trusts the body until the signature over its exact bytes verifies, so the route is
  mounted with `express.raw` and BEFORE `express.json` (which would consume and reformat them).
 */

type RazorpayWebhookEvent = {
    event?: string;
    payload?: {
        payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
        order?: { entity?: { id?: string } };
    };
};

const signatureMatches = (rawBody: Buffer, signature: string): boolean => {
    const expected = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest();

    let received: Buffer;
    try {
        received = Buffer.from(signature, "hex");
    } catch {
        return false;
    }

    // Length is checked first because timingSafeEqual throws on a mismatch.
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

/*
  Not wrapped in `catchError`: Razorpay retries anything that isn't a 2xx, and a retry storm is the
  last thing a half-working server needs. Failures are logged and acknowledged instead, except for a
  bad signature — that is never ours to process.
 */
export const razorpayWebhookHandler = async (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    const signature = req.headers["x-razorpay-signature"];

    if (!Buffer.isBuffer(rawBody) || typeof signature !== "string" || !signatureMatches(rawBody, signature)) {
        console.warn("[razorpay-webhook] rejected: missing or invalid signature");
        return res.status(BAD_REQUEST).json({ status: "error", data: null });
    }

    let event: RazorpayWebhookEvent;
    try {
        event = JSON.parse(rawBody.toString("utf8"));
    } catch {
        console.warn("[razorpay-webhook] rejected: body is not JSON");
        return res.status(BAD_REQUEST).json({ status: "error", data: null });
    }

    // Both events carry the captured payment; `order.paid` is the belt to `payment.captured`'s braces.
    const isPaidEvent = event.event === "payment.captured" || event.event === "order.paid";
    const payment = event.payload?.payment?.entity;

    if (!isPaidEvent || !payment?.id || !payment.order_id) {
        // Something we don't act on (a refund, a failed payment). Acknowledge so it isn't retried.
        return res.status(OK).json({ status: "success", data: { handled: false } });
    }

    try {
        const order = await OrderModel.findOne({ razorpayOrderId: payment.order_id }).select(
            "_id totalAmount paymentStatus"
        );

        if (!order) {
            console.warn(`[razorpay-webhook] no order for razorpay order ${payment.order_id}`);
            return res.status(OK).json({ status: "success", data: { handled: false } });
        }

        /*
          The same amount check confirm makes. A mismatch means the payment doesn't correspond to
          what was ordered, so it is never fulfilled automatically — it is flagged for a human, and
          acknowledged, because retrying it would only produce the same mismatch.
         */
        if (typeof payment.amount === "number" && payment.amount !== toSubUnits(order.totalAmount)) {
            console.error(
                `[razorpay-webhook] amount mismatch on order ${order._id}: ` +
                `gateway ${payment.amount} vs expected ${toSubUnits(order.totalAmount)} — not fulfilled`
            );
            return res.status(OK).json({ status: "success", data: { handled: false } });
        }

        const { fulfilled } = await fulfillPaidOrder(order._id, payment.id);

        if (fulfilled) {
            console.log(`[razorpay-webhook] order ${order._id} fulfilled from ${event.event}`);
        }

        return res.status(OK).json({ status: "success", data: { handled: true, fulfilled } });
    } catch (error) {
        /*
          A 500 would have Razorpay redeliver, which is what we want for a transient failure (the
          database being briefly unreachable): fulfilment is idempotent, so a redelivery is safe.
         */
        console.error("[razorpay-webhook] failed to process event:", error);
        return res.status(500).json({ status: "error", data: null });
    }
};
