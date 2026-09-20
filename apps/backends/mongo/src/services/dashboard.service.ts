import ProductModel from "../models/product.model";
import CategoryModel from "../models/category.model";
import UserModel from "../models/user.model";
import { OrderModel } from "../models/order.model";
import { ALLOWED_ORDER_STATUSES } from "@repo/types";

type TotalSaleRow = {
    _id: null;
    totalSales: number;
};

export const getDashboardLiteService = async () => {
    const [
        totalProducts,
        totalCategories,
        totalOrders,
        totalReturnedOrders,
        salesRows,
    ] = await Promise.all([
        ProductModel.countDocuments(),
        CategoryModel.countDocuments(),
        OrderModel.countDocuments(),
        OrderModel.countDocuments({ orderStatus: "returned" }),
        OrderModel.aggregate<TotalSaleRow>([
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
        ]),
    ]);

    return {
        totalProducts,
        totalCategories,
        totalSales: salesRows[0]?.totalSales || 0,
        totalOrders,
        totalReturnedOrders,
    };
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Days are bucketed on the store's calendar, not UTC — an order at 1am IST belongs to "today".
const STORE_TIMEZONE = "Asia/Kolkata";
const LOW_STOCK_THRESHOLD = 5;

const toStoreDate = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(date); // YYYY-MM-DD

type PeriodRow = { _id: "current" | "previous"; revenue: number; orders: number };
type SeriesRow = { _id: string; revenue: number; orders: number };
type StatusRow = { _id: string; count: number };
type TopProductRow = {
    _id: unknown;
    units: number;
    revenue: number;
    title?: string;
    images?: Array<{ url: string; isCover?: boolean }>;
};

/**
 * Everything the admin dashboard shows, scoped to the last `days` days, with the equal-length
 * window before it for comparison. Revenue and paid-order counts are dated by `paidAt` — an order
 * paid days after it was placed counts when the money arrived. Order-status counts and recent
 * orders are dated by `createdAt`. Low stock is current state, so it ignores the range.
 */
export const getDashboardService = async (days: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - days * DAY_MS);
    const previousStart = new Date(start.getTime() - days * DAY_MS);

    const [
        periodRows,
        seriesRows,
        statusRows,
        topProductRows,
        recentOrders,
        lowStock,
        totalCustomers,
        newCustomers,
        previousNewCustomers,
        activeProducts,
    ] = await Promise.all([
        OrderModel.aggregate<PeriodRow>([
            { $match: { paymentStatus: "paid", paidAt: { $gte: previousStart, $lt: now } } },
            {
                $group: {
                    _id: { $cond: [{ $gte: ["$paidAt", start] }, "current", "previous"] },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 },
                },
            },
        ]),
        OrderModel.aggregate<SeriesRow>([
            { $match: { paymentStatus: "paid", paidAt: { $gte: start, $lt: now } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: STORE_TIMEZONE },
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 },
                },
            },
        ]),
        OrderModel.aggregate<StatusRow>([
            { $match: { createdAt: { $gte: start, $lt: now } } },
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ]),
        OrderModel.aggregate<TopProductRow>([
            { $match: { paymentStatus: "paid", paidAt: { $gte: start, $lt: now } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    units: { $sum: "$items.quantity" },
                    revenue: { $sum: "$items.itemTotal" },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: ProductModel.collection.name,
                    localField: "_id",
                    foreignField: "_id",
                    as: "product",
                },
            },
            {
                $project: {
                    units: 1,
                    revenue: 1,
                    title: { $arrayElemAt: ["$product.title", 0] },
                    images: { $arrayElemAt: ["$product.images", 0] },
                },
            },
        ]),
        OrderModel.find({ createdAt: { $gte: start, $lt: now } })
            .select("customerName customerEmail totalItems totalAmount paymentStatus orderStatus createdAt")
            .sort({ createdAt: -1 })
            .limit(6)
            .lean(),
        /*
          Stock is per (colour, size) now, so "running low" is about the product's total across
          its variants — which can't be a plain query field without keeping a second copy of the
          number that would drift. Summing it in the pipeline keeps one source of truth.
         */
        ProductModel.aggregate([
            { $match: { status: "active" } },
            { $addFields: { totalStock: { $sum: "$variants.stock" } } },
            { $match: { totalStock: { $lte: LOW_STOCK_THRESHOLD } } },
            { $sort: { totalStock: 1 } },
            { $limit: 6 },
            { $project: { title: 1, totalStock: 1, images: 1 } },
        ]),
        UserModel.countDocuments({ role: "user" }),
        UserModel.countDocuments({ role: "user", createdAt: { $gte: start, $lt: now } }),
        UserModel.countDocuments({ role: "user", createdAt: { $gte: previousStart, $lt: start } }),
        ProductModel.countDocuments({ status: "active" }),
    ]);

    const current = periodRows.find((row) => row._id === "current") ?? { revenue: 0, orders: 0 };
    const previous = periodRows.find((row) => row._id === "previous") ?? { revenue: 0, orders: 0 };
    const averageOrderValue = (period: { revenue: number; orders: number }) =>
        period.orders ? Math.round(period.revenue / period.orders) : 0;

    // One point per calendar day, zero-filled, so the chart's x-axis is continuous.
    const seriesByDate = new Map(seriesRows.map((row) => [row._id, row]));
    const revenueSeries = Array.from({ length: days }, (_, index) => {
        const date = toStoreDate(new Date(now.getTime() - (days - 1 - index) * DAY_MS));
        const row = seriesByDate.get(date);
        return { date, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 };
    });

    const countByStatus = new Map(statusRows.map((row) => [row._id, row.count]));
    const statusBreakdown = ALLOWED_ORDER_STATUSES.map((status) => ({
        status,
        count: countByStatus.get(status) ?? 0,
    }));

    const coverOf = (images?: Array<{ url: string; isCover?: boolean }>) =>
        images?.find((img) => img.isCover)?.url || images?.[0]?.url || "";

    return {
        range: { days, from: start, to: now },
        kpis: {
            revenue: { current: current.revenue, previous: previous.revenue },
            orders: { current: current.orders, previous: previous.orders },
            averageOrderValue: {
                current: averageOrderValue(current),
                previous: averageOrderValue(previous),
            },
            newCustomers: { current: newCustomers, previous: previousNewCustomers },
            totalCustomers,
            activeProducts,
        },
        revenueSeries,
        statusBreakdown,
        topProducts: topProductRows.map((row) => ({
            productId: String(row._id),
            // A product deleted after it sold still counts toward revenue; it just has no title.
            title: row.title ?? null,
            image: coverOf(row.images),
            units: row.units,
            revenue: row.revenue,
        })),
        recentOrders: recentOrders.map((order) => ({
            _id: String(order._id),
            code: String(order._id).slice(-8).toUpperCase(),
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            totalItems: order.totalItems,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
        })),
        lowStock: lowStock.map((product) => ({
            productId: String(product._id),
            title: product.title,
            stock: product.totalStock,
            image: coverOf(product.images),
        })),
        lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
};
