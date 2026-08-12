import mongoose, { Types } from "mongoose";
import { OrderModel } from "../models/order.model";
import ProductModel from "../models/product.model";
import UserModel from "../models/user.model";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { AdminOrderRow, CustomerOrderRow } from "../types/order.types";
import { UpdateOrderStatusSchema } from "@repo/types";
import { SEVEN_DAYS_MS } from "../utils";

export const getOrderService = async (userId: string | Types.ObjectId) => {
    const findOrders = await OrderModel.find({ user: userId })
        .select("totalItems totalAmount paymentStatus orderStatus paidAt deliveredAt returnedAt createdAt")
        .sort({ createdAt: -1 }).lean<CustomerOrderRow[]>();
    return findOrders;
};

export const getAllOrdersService = async () => {
    const orders = await OrderModel.find()
        .select(
            "customerName customerEmail totalItems totalAmount paymentStatus orderStatus paidAt deliveredAt returnedAt createdAt"
        )
        .sort({ createdAt: -1 })
        .lean<AdminOrderRow[]>();

    return orders;
};

export const returnOrderService = async (
    userId: string | Types.ObjectId,
    orderId: string
) => {
    appAssert(
        mongoose.isValidObjectId(orderId),
        BAD_REQUEST,
        "Invalid order ID"
    );

    const order = await OrderModel.findOne({
        _id: orderId,
        user: userId,
    });

    appAssert(order, NOT_FOUND, "Order not found");

    if (order.orderStatus === "returned") {
        return {
            _id: String(order._id),
            orderStatus: order.orderStatus,
            returnedAt: order.returnedAt,
        };
    }

    appAssert(
        order.orderStatus === "delivered" && Boolean(order.deliveredAt),
        BAD_REQUEST,
        "Only delivered orders can be returned"
    );

    const deliveredTime = new Date(order.deliveredAt!).getTime();

    appAssert(
        Date.now() - deliveredTime <= SEVEN_DAYS_MS,
        BAD_REQUEST,
        "Return Time expired"
    );

    for (const item of order.items) {
        await ProductModel.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } }
        );
    }

    await UserModel.updateOne(
        { _id: userId },
        { $inc: { points: order.totalAmount } }
    );

    order.orderStatus = "returned";
    order.returnedAt = new Date();
    await order.save();

    return {
        _id: String(order._id),
        orderStatus: order.orderStatus,
        returnedAt: order.returnedAt,
    };
};



export const updateOrderStatusService = async (
    orderId: string,
    data: UpdateOrderStatusSchema
) => {
    appAssert(
        mongoose.isValidObjectId(orderId),
        BAD_REQUEST,
        "Invalid order ID"
    );

    const session = await mongoose.startSession();

    let response: {
        _id: string;
        orderStatus: string;
        deliveredAt?: Date | null;
        returnedAt?: Date | null;
    };

    try {
        await session.withTransaction(async () => {
            const order = await OrderModel.findById(orderId).session(
                session
            );

            appAssert(
                order,
                NOT_FOUND,
                "Order not found"
            );

            if (
                data.orderStatus === "returned" &&
                order.orderStatus !== "returned"
            ) {
                // Restore product stock atomically.
                for (const item of order.items) {
                    const updated =
                        await ProductModel.updateOne(
                            {
                                _id: item.product,
                            },
                            {
                                $inc: {
                                    stock: item.quantity,
                                },
                            },
                            {
                                session,
                            }
                        );

                    appAssert(
                        updated.matchedCount > 0,
                        NOT_FOUND,
                        "One or more products no longer exist"
                    );
                }

                // Refund points to the customer.
                const updatedUser =
                    await UserModel.updateOne(
                        {
                            _id: order.user,
                        },
                        {
                            $inc: {
                                points: order.totalAmount,
                            },
                        },
                        {
                            session,
                        }
                    );

                appAssert(
                    updatedUser.matchedCount > 0,
                    NOT_FOUND,
                    "User not found"
                );

                order.returnedAt = new Date();
            }

            if (
                data.orderStatus === "delivered" &&
                !order.deliveredAt
            ) {
                order.deliveredAt = new Date();
            }

            // Finally update the order status.
            order.orderStatus = data.orderStatus;

            await order.save({
                session,
            });

            response = {
                _id: String(order._id),
                orderStatus: order.orderStatus,
                deliveredAt: order.deliveredAt,
                returnedAt: order.returnedAt,
            };
        });
    } finally {
        await session.endSession();
    }

    return response!;
};