import type { OrderStatus, PaymentStatus } from "./order.types";

// A figure for the selected window alongside the same-length window before it.
export type PeriodComparison = {
    current: number;
    previous: number;
};

export type RevenuePoint = {
    // Store-calendar day, YYYY-MM-DD.
    date: string;
    revenue: number;
    orders: number;
};

export type DashboardResponse = {
    range: { days: number; from: string; to: string };
    kpis: {
        revenue: PeriodComparison;
        orders: PeriodComparison;
        averageOrderValue: PeriodComparison;
        newCustomers: PeriodComparison;
        totalCustomers: number;
        activeProducts: number;
    };
    revenueSeries: RevenuePoint[];
    statusBreakdown: Array<{ status: OrderStatus; count: number }>;
    topProducts: Array<{
        productId: string;
        // null when the product was deleted after it sold.
        title: string | null;
        image: string;
        units: number;
        revenue: number;
    }>;
    recentOrders: Array<{
        _id: string;
        code: string;
        customerName: string;
        customerEmail: string;
        totalItems: number;
        totalAmount: number;
        paymentStatus: PaymentStatus;
        orderStatus: OrderStatus;
        createdAt: string;
    }>;
    lowStock: Array<{ productId: string; title: string; stock: number; image: string }>;
    lowStockThreshold: number;
};
