import mongoose, { Types } from "mongoose";
import { OrderModel } from "../models/order.model";
import ProductModel from "../models/product.model";
import UserModel from "../models/user.model";
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { restockFilter } from "../utils/variants";
import { invalidateProductDetails } from "./product.service";
import { callRazorpay, razorpay } from "../utils/razorpay";
import { AdminOrderRow, CustomerOrderRow } from "../types/order.types";
import { ORDER_STATUS_TRANSITIONS, PaginationQuery, UpdateOrderStatusSchema } from "@repo/types";
import { SEVEN_DAYS_MS } from "../utils";

export const getOrderService = async (userId: string | Types.ObjectId) => {
    const findOrders = await OrderModel.find({ user: userId })
        .select(
            "items deliveryName deliveryAddress promoCode discountAmount totalItems totalAmount paymentStatus orderStatus paidAt deliveredAt returnedAt shippedAt cancelledAt cancelledBy createdAt"
        )
        .populate({
            path: "items.product",
            select: "title images brand",
            populate: { path: "brand", select: "name" },
        })
        .sort({ createdAt: -1 })
        .lean<CustomerOrderRow[]>();
    return findOrders;
};

// One page of every customer's orders, newest first. Unpaginated this loaded the entire order
// history, with each line's product populated, on every visit to the admin table.
export const getAllOrdersService = async ({ page, limit }: PaginationQuery) => {
    const [orders, total] = await Promise.all([
        OrderModel.find()
            .select(
                "customerName customerEmail items deliveryName deliveryAddress promoCode discountAmount paymentId totalItems totalAmount paymentStatus orderStatus paidAt deliveredAt returnedAt shippedAt cancelledAt cancelledBy createdAt"
            )
            .populate({
                path: "items.product",
                select: "title images brand",
                populate: { path: "brand", select: "name" },
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<AdminOrderRow[]>(),
        OrderModel.estimatedDocumentCount(),
    ]);

    return { orders, total };
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

    /*
      Restock, points and the status change are one transaction, as they already are on the admin
      path. Separately they could half-apply: a failure after the restock left the order still
      "delivered", so returning it again restocked it a second time and paid the points twice — and
      two requests arriving together did the same thing without any failure at all.

      The status is claimed first with a conditional update. Only the caller whose update matches
      "delivered" owns the return and does the rest; a second one matches nothing and stops.
     */
    const session = await mongoose.startSession();

    let restockedProductIds: unknown[] = [];
    let response: {
        _id: string;
        orderStatus: string;
        returnedAt?: Date | null;
    };

    try {
        await session.withTransaction(async () => {
            // Reset per attempt: withTransaction re-runs this callback on a write conflict.
            restockedProductIds = [];

            const claimed = await OrderModel.findOneAndUpdate(
                { _id: orderId, user: userId, orderStatus: "delivered" },
                { $set: { orderStatus: "returned", returnedAt: new Date() } },
                { new: true, session }
            );

            // Lost the race — whoever won has already restocked and paid the points.
            if (!claimed) {
                const current = await OrderModel.findOne({ _id: orderId, user: userId })
                    .select("orderStatus returnedAt")
                    .session(session);

                appAssert(current, NOT_FOUND, "Order not found");
                appAssert(
                    current.orderStatus === "returned",
                    BAD_REQUEST,
                    "Only delivered orders can be returned"
                );

                response = {
                    _id: String(current._id),
                    orderStatus: current.orderStatus,
                    returnedAt: current.returnedAt,
                };
                return;
            }

            // Back onto the exact row it left from — the returned item's own colour and size, not
            // the product as a whole.
            for (const item of claimed.items) {
                const updated = await ProductModel.updateOne(
                    { _id: item.product },
                    { $inc: { "variants.$[variant].stock": item.quantity } },
                    { arrayFilters: [restockFilter(item)], session }
                );

                // modifiedCount, not matchedCount: the document matches even when no variant row
                // does, which would silently skip the restock.
                appAssert(
                    updated.modifiedCount > 0,
                    NOT_FOUND,
                    "One or more products no longer have this colour and size"
                );
            }

            const refunded = await UserModel.updateOne(
                { _id: userId },
                { $inc: { points: claimed.totalAmount } },
                { session }
            );
            appAssert(refunded.matchedCount > 0, NOT_FOUND, "User not found");

            restockedProductIds = claimed.items.map((item) => item.product);
            response = {
                _id: String(claimed._id),
                orderStatus: claimed.orderStatus,
                returnedAt: claimed.returnedAt,
            };
        });
    } finally {
        await session.endSession();
    }

    // After commit, so a rolled-back return doesn't invalidate anything.
    await invalidateProductDetails(restockedProductIds);

    return response!;
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

    // Same guard as the customer cancel: an order still "unpaid" in our database may have been
    // captured at Razorpay if the customer's confirm never ran. Cancelling it would leave them
    // charged for nothing. Checked before the transaction because it's a network call.
    if (data.orderStatus === "cancelled") {
        const target = await OrderModel.findById(orderId).select("razorpayOrderId paymentStatus");
        appAssert(target, NOT_FOUND, "Order not found");
        if (target.paymentStatus !== "paid" && target.razorpayOrderId) {
            const razorpayOrder = await callRazorpay("fetch order", () =>
                razorpay.orders.fetch(target.razorpayOrderId)
            );
            appAssert(
                razorpayOrder.status !== "paid",
                CONFLICT,
                "Razorpay shows this order as paid even though it was never confirmed here — don't cancel it; reconcile the payment first."
            );
        }
    }

    // Set inside the transaction when a return restocks, so the product pages can be refreshed after commit.
    let restockedProductIds: unknown[] = [];
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

            // Checked against the fresh document inside the transaction, so two admins acting at
            // once can't both apply a move from the same starting status.
            const allowedNext = ORDER_STATUS_TRANSITIONS[order.orderStatus] ?? [];
            appAssert(
                allowedNext.includes(data.orderStatus),
                BAD_REQUEST,
                allowedNext.length
                    ? `An order that is "${order.orderStatus}" can only be moved to: ${allowedNext.join(", ")}`
                    : `An order that is "${order.orderStatus}" can no longer be changed`
            );

            if (
                data.orderStatus === "returned" &&
                order.orderStatus !== "returned"
            ) {
                restockedProductIds = order.items.map((item) => item.product);
                // Restore stock atomically, onto each item's own (colour, size) row.
                for (const item of order.items) {
                    const updated =
                        await ProductModel.updateOne(
                            {
                                _id: item.product,
                            },
                            {
                                $inc: {
                                    "variants.$[variant].stock": item.quantity,
                                },
                            },
                            {
                                arrayFilters: [restockFilter(item)],
                                session,
                            }
                        );

                    // modifiedCount, not matchedCount: the document matches even when no variant
                    // row does, which would silently skip the restock.
                    appAssert(
                        updated.modifiedCount > 0,
                        NOT_FOUND,
                        "One or more products no longer have this colour and size"
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

            if (data.orderStatus === "shipped" && !order.shippedAt) {
                order.shippedAt = new Date();
            }

            if (data.orderStatus === "cancelled") {
                order.cancelledAt = new Date();
                order.cancelledBy = "admin";
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

    // After commit, so a rolled-back return doesn't invalidate anything.
    await invalidateProductDetails(restockedProductIds);

    return response!;
};

/**
 * Lets a customer cancel an order they never paid for (one abandoned at the payment gateway).
 * Nothing needs restoring: stock and promo counts are only decremented when a payment confirms.
 */
export const cancelOrderService = async (
    userId: string | Types.ObjectId,
    orderId: string
) => {
    appAssert(mongoose.isValidObjectId(orderId), BAD_REQUEST, "Invalid order ID");

    // Scoped to the user, so nobody can cancel someone else's order.
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    appAssert(order, NOT_FOUND, "Order not found");

    const toResult = (doc: { _id: unknown; orderStatus: string; cancelledAt?: Date | null }) => ({
        _id: String(doc._id),
        orderStatus: doc.orderStatus,
        cancelledAt: doc.cancelledAt ?? null,
    });

    // A double-click, or a second tab, is harmless.
    if (order.orderStatus === "cancelled") {
        return toResult(order);
    }

    appAssert(
        order.orderStatus === "pending_payment" && order.paymentStatus === "pending",
        BAD_REQUEST,
        "Only unpaid orders can be cancelled"
    );

    const code = String(order._id).slice(-8).toUpperCase();

    // If Razorpay already has this order as paid, the customer WAS charged and only our confirm
    // didn't run. Cancelling would leave them paying for nothing — refuse and point at support.
    const razorpayOrder = await callRazorpay("fetch order", () =>
        razorpay.orders.fetch(order.razorpayOrderId)
    );
    appAssert(
        razorpayOrder.status !== "paid",
        CONFLICT,
        `We've already received a payment for order #${code}. Please contact support with this order number.`
    );

    // Conditional on the order still being unpaid, so a confirm landing at the same moment wins
    // cleanly instead of being overwritten.
    const cancelled = await OrderModel.findOneAndUpdate(
        { _id: orderId, user: userId, orderStatus: "pending_payment", paymentStatus: "pending" },
        { $set: { orderStatus: "cancelled", cancelledAt: new Date(), cancelledBy: "customer" } },
        { new: true }
    );
    appAssert(cancelled, CONFLICT, `Order #${code} was just paid, so it can't be cancelled.`);

    return toResult(cancelled);
};
