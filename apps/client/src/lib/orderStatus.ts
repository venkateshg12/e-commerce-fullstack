import type { OrderStatus, PaymentStatus } from "@/types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

// One place for how an order status reads and looks — the customer's orders page, the admin
// orders page and the dashboard all use it.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
    pending_payment: { label: "Payment pending", variant: "outline" },
    placed: { label: "Placed", variant: "default" },
    shipped: { label: "Shipped", variant: "secondary" },
    delivered: { label: "Delivered", variant: "secondary" },
    returned: { label: "Returned", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: "Unpaid", variant: "outline" },
    paid: { label: "Paid", variant: "secondary" },
    failed: { label: "Failed", variant: "destructive" },
};

// The button label for moving an order INTO a status.
export const ORDER_STATUS_ACTION: Record<OrderStatus, string> = {
    pending_payment: "Mark payment pending",
    placed: "Mark as placed",
    shipped: "Mark as shipped",
    delivered: "Mark as delivered",
    returned: "Mark as returned",
    cancelled: "Cancel order",
};

export const formatOrderDate = (value: string, withTime = false) =>
    new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    });

// ₹1,234 / ₹12.3K / ₹4.2L — Indian grouping, compacted for tiles and axes.
export const formatRupees = (value: number, compact = false) =>
    compact
        ? `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`
        : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
