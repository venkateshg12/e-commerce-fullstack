import { OK } from "../constants/https";
import { paginationQuerySchema, updateOrderStatusSchema } from "@repo/types";
import {
    cancelOrderService,
    getAllOrdersService,
    getOrderService,
    returnOrderService,
    updateOrderStatusService,
} from "../services/order.service";
import { catchError, ok, SEVEN_DAYS_MS } from "../utils";
import type { CustomerOrderItemRow } from "../types/order.types";

/*
  Whether the customer can still send this order back, decided here rather than in the browser: the
  7-day window is the server's rule (returnOrderService), and a client clock that is wrong — or a
  page left open overnight — would otherwise offer a button the endpoint then refuses.
 */
const RETURN_WINDOW_MS = SEVEN_DAYS_MS;

const returnability = (order: { orderStatus: string; deliveredAt?: Date | string | null }) => {
    if (order.orderStatus !== "delivered" || !order.deliveredAt) {
        return { canReturn: false, returnDaysLeft: 0 };
    }

    const msLeft = new Date(order.deliveredAt).getTime() + RETURN_WINDOW_MS - Date.now();

    return {
        canReturn: msLeft > 0,
        returnDaysLeft: msLeft > 0 ? Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000))) : 0,
    };
};

// Populated order lines → what the client renders. Shared by the customer and admin lists.
const toOrderLines = (items: CustomerOrderItemRow[]) =>
    items.map((line) => {
        const product = line.product;
        return {
            // null once the admin deletes the product — the line is still real, so it is kept
            // and the client labels it rather than dropping the order's history.
            productId: product ? String(product._id) : null,
            title: product?.title ?? null,
            brand: product?.brand?.name ?? "",
            image:
                product?.images?.find((img) => img.isCover)?.url ||
                product?.images?.[0]?.url ||
                "",
            color: line.color,
            size: line.size,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            itemTotal: line.itemTotal,
        };
    });

export const getOrdersHandler = catchError(
    async (req, res) => {
        const orders = await getOrderService(req.userId!);
        res.status(OK).json(ok({
            items: orders.map((orderItem) => ({
                _id: String(orderItem._id),
                code: String(orderItem._id).slice(-8).toUpperCase(),
                items: toOrderLines(orderItem.items),
                deliveryName: orderItem.deliveryName,
                deliveryAddress: orderItem.deliveryAddress,
                promoCode: orderItem.promoCode || "",
                discountAmount: orderItem.discountAmount ?? 0,
                totalItems: orderItem.totalItems,
                totalAmount: orderItem.totalAmount,
                paymentStatus: orderItem.paymentStatus,
                orderStatus: orderItem.orderStatus,
                paidAt: orderItem.paidAt || null,
                deliveredAt: orderItem.deliveredAt || null,
                returnedAt: orderItem.returnedAt || null,
                shippedAt: orderItem.shippedAt || null,
                cancelledAt: orderItem.cancelledAt || null,
                cancelledBy: orderItem.cancelledBy || null,
                createdAt: orderItem.createdAt,
                ...returnability(orderItem),
            }))
        }));
    }
);

export const getAllOrdersHandler = catchError(
    async (req, res) => {
        const { page, limit } = paginationQuerySchema.parse(req.query);
        const { orders, total } = await getAllOrdersService({ page, limit });
        res.status(OK).json(
            ok({
                items: orders.map((orderItem) => ({
                    _id: String(orderItem._id),
                    code: String(orderItem._id).slice(-8).toUpperCase(),
                    customerName: orderItem.customerName,
                    customerEmail: orderItem.customerEmail,
                    items: toOrderLines(orderItem.items),
                    deliveryName: orderItem.deliveryName,
                    deliveryAddress: orderItem.deliveryAddress,
                    promoCode: orderItem.promoCode || "",
                    discountAmount: orderItem.discountAmount ?? 0,
                    paymentId: orderItem.paymentId || "",
                    totalItems: orderItem.totalItems,
                    totalAmount: orderItem.totalAmount,
                    paymentStatus: orderItem.paymentStatus,
                    orderStatus: orderItem.orderStatus,
                    paidAt: orderItem.paidAt || null,
                    deliveredAt: orderItem.deliveredAt || null,
                    returnedAt: orderItem.returnedAt || null,
                    shippedAt: orderItem.shippedAt || null,
                    cancelledAt: orderItem.cancelledAt || null,
                    cancelledBy: orderItem.cancelledBy || null,
                    createdAt: orderItem.createdAt,
                })),
            }, { page, limit, total, hasMore: page * limit < total })
        );
    }
);

export const returnOrderHandler = catchError(
    async (req, res) => {
        const orderId = (req.params.orderId) as string;
        const result = await returnOrderService(req.userId!, orderId);
        res.status(OK).json(ok(result));
    }
);

export const updateOrderStatusHandler = catchError(
    async (req, res) => {
        const orderId = req.params.orderId as string;
        const data = updateOrderStatusSchema.parse(req.body);
        const result = await updateOrderStatusService(orderId, data);
        res.status(OK).json(ok(result));
    }
);
export const cancelOrderHandler = catchError(
    async (req, res) => {
        const orderId = req.params.orderId as string;
        const result = await cancelOrderService(req.userId!, orderId);
        res.status(OK).json(ok(result));
    }
);
