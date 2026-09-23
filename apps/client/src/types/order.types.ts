import type { ProductSize } from "@repo/types";

export type PaymentStatus = "pending" | "paid" | "failed";

export type OrderStatus =
    | "pending_payment"
    | "placed"
    | "shipped"
    | "delivered"
    | "returned"
    | "cancelled";

// One purchased line. `productId` and `title` are null when the admin has since deleted the
// product — orders keep only a reference, not a snapshot — so the line is shown but not linked.
export type OrderItem = {
    productId: string | null;
    title: string | null;
    brand: string;
    image: string;
    color?: string;
    size?: ProductSize;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
};

// There is no GET /orders/:id, so everything the list card needs comes back on this one payload.
export type OrderSummary = {
    _id: string;
    // Last 8 characters of the id, uppercased — what the customer quotes to support.
    code: string;
    items: OrderItem[];
    deliveryName: string;
    deliveryAddress: string;
    promoCode: string;
    discountAmount: number;
    totalItems: number;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    paidAt: string | null;
    deliveredAt: string | null;
    returnedAt: string | null;
    // Decided by the server, which owns the 7-day return window — see order.controller.ts.
    canReturn: boolean;
    returnDaysLeft: number;
    shippedAt: string | null;
    cancelledAt: string | null;
    // Who cancelled it — shown in the admin order timeline.
    cancelledBy: "customer" | "admin" | null;
    createdAt: string;
};

export type OrderListResponse = {
    items: OrderSummary[];
};

// GET /admin/orders — every customer's orders, with who placed them and the payment reference.
export type AdminOrder = OrderSummary & {
    customerName: string;
    customerEmail: string;
    paymentId: string;
};

export type AdminOrderListResponse = {
    items: AdminOrder[];
};
