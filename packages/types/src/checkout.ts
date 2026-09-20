import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
    addressId: z.string().trim().min(1, { message: "Address ID is required" }),
    promoCode: z.string().trim().toUpperCase().optional(),
});

export type CreateCheckoutSessionSchema = z.infer<typeof createCheckoutSessionSchema>;

export const confirmCheckoutSessionSchema = z.object({
    orderId: z.string().trim().min(1, { message: "Order ID is required" }),
    razorpay_payment_id: z.string().trim().min(1, { message: "Razorpay payment ID is required" }),
    razorpay_order_id: z.string().trim().min(1, { message: "Razorpay order ID is required" }),
    razorpay_signature: z.string().trim().min(1, { message: "Razorpay signature is required" }),
});

export type ConfirmCheckoutSessionSchema = z.infer<typeof confirmCheckoutSessionSchema>;

export const payWithPointsSchema = z.object({
    addressId: z.string().trim().min(1, { message: "Address ID is required" }),
    promoCode: z.string().trim().toUpperCase().optional(),
});

export type PayWithPointsSchema = z.infer<typeof payWithPointsSchema>;

// Resumes payment for an order abandoned at the gateway, rather than building a new one from the cart.
export const resumeCheckoutSessionSchema = z.object({
    orderId: z.string().trim().min(1, { message: "Order ID is required" }),
});

export type ResumeCheckoutSessionSchema = z.infer<typeof resumeCheckoutSessionSchema>;

export const ALLOWED_ORDER_STATUSES = [
    "pending_payment",
    "placed",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
] as const;

export type OrderStatusValue = (typeof ALLOWED_ORDER_STATUSES)[number];

/**
 * Where an order may move next. Enforced by the server; the admin UI reads the same map so it only
 * ever offers valid actions.
 *  - Unpaid orders can only be cancelled — they must never be shipped.
 *  - Fulfilment only moves forward.
 *  - `returned` credits the customer's points, so it is terminal: flipping an order out of it and
 *    back again would credit them twice.
 *  - A paid order can't be cancelled yet: there is no refund path for a Razorpay payment.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
    pending_payment: ["cancelled"],
    placed: ["shipped"],
    shipped: ["delivered"],
    delivered: ["returned"],
    returned: [],
    cancelled: [],
};

export const updateOrderStatusSchema = z.object({
    orderStatus: z.enum(ALLOWED_ORDER_STATUSES, { message: "Invalid order status" }),
});

export type UpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;



