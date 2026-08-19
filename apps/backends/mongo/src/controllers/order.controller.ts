import { OK } from "../constants/https";
import { updateOrderStatusSchema } from "@repo/types";
import {
    getAllOrdersService,
    getOrderService,
    returnOrderService,
    updateOrderStatusService,
} from "../services/order.service";
import { catchError, ok } from "../utils";

export const getOrdersHandler = catchError(
    async (req, res) => {
        const orders = await getOrderService(req.userId!);
        res.status(OK).json(ok({
            items: orders.map((orderItem) => ({
                _id: String(orderItem._id),
                code: String(orderItem._id).slice(-8).toUpperCase(),
                totalItems: orderItem.totalItems,
                totalAmount: orderItem.totalAmount,
                paymentStatus: orderItem.paymentStatus,
                orderStatus: orderItem.orderStatus,
                paidAt: orderItem.paidAt || null,
                deliveredAt: orderItem.deliveredAt || null,
                returnedAt: orderItem.returnedAt || null,
                createdAt: orderItem.createdAt,
            }))
        }));
    }
);

export const getAllOrdersHandler = catchError(
    async (req, res) => {
        const orders = await getAllOrdersService();
        res.status(OK).json(
            ok({
                items: orders.map((orderItem) => ({
                    _id: String(orderItem._id),
                    code: String(orderItem._id).slice(-8).toUpperCase(),
                    customerName: orderItem.customerName,
                    customerEmail: orderItem.customerEmail,
                    totalItems: orderItem.totalItems,
                    totalAmount: orderItem.totalAmount,
                    paymentStatus: orderItem.paymentStatus,
                    orderStatus: orderItem.orderStatus,
                    paidAt: orderItem.paidAt || null,
                    deliveredAt: orderItem.deliveredAt || null,
                    returnedAt: orderItem.returnedAt || null,
                    createdAt: orderItem.createdAt,
                })),
            })
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