import type { Promo } from "./promo.types";

export type CheckoutSessionResponse = {
    razorpay: {
        keyId: string;
        orderId: string;
        // In paise — Razorpay's own unit. Never render this; use order.totalAmount for rupees.
        amount: number;
        currency: string;
    };
    order: {
        _id: string;
        totalItems: number;
        subtotal: number;
        discountAmount: number;
        totalAmount: number;
        paymentStatus: string;
        orderStatus: string;
    };
};

export type ConfirmCheckoutResponse = {
    _id: string;
};

export type PointsResponse = {
    points: number;
};

export type PayWithPointsResponse = {
    _id: string;
    // The balance REMAINING after the spend, not the amount spent.
    totalPoints: number;
};

// POST /promos/apply nests the promo under `item`.
export type ApplyPromoResponse = {
    item: Promo;
};

// Passed to /order-success through router state — there is no GET /orders/:id to fetch from.
export type OrderSuccessState = {
    orderId: string;
    method: "razorpay" | "points";
    totalAmount: number;
    remainingPoints?: number;
};
