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

export const ALLOWED_ORDER_STATUSES = [
    "pending_payment",
    "placed",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
] as const;

export const updateOrderStatusSchema = z.object({
    orderStatus: z.enum(ALLOWED_ORDER_STATUSES, { message: "Invalid order status" }),
});

export type UpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;



