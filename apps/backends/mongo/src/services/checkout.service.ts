import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import UserModel from "../models/user.model";
import { CartModel } from "../models/cartItem.model";
import { PromoModel } from "../models/promo.model";
import ProductModel from "../models/product.model";
import { OrderModel } from "../models/order.model";
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { getVariantStock, variantFilter } from "../utils/variants";
import {
    ConfirmCheckoutSessionSchema,
    CreateCheckoutSessionSchema,
    PayWithPointsSchema,
    ResumeCheckoutSessionSchema,
} from "@repo/types";
import { callRazorpay, razorpay } from "../utils/razorpay";
import { toSubUnits } from "../utils/currency";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../constants/env";


export const createCheckoutSessionService = async (
    userId: string | Types.ObjectId,
    data: CreateCheckoutSessionSchema
) => {
    appAssert(
        mongoose.isValidObjectId(data.addressId),
        BAD_REQUEST,
        "Invalid address ID"
    );

    // Get user and cart in parallel because they are independent queries.
    const [user, cart] = await Promise.all([
        UserModel.findById(userId),
        CartModel.findOne({ user: userId }).select("items"),
    ]);

    appAssert(user, NOT_FOUND, "User not found");

    appAssert(
        cart && cart.items.length > 0,
        BAD_REQUEST,
        "Cart is empty"
    );

    // Make sure the selected address actually belongs to this user.
    const selectedAddress = user.address.find(
        (address: any) =>
            String(address._id) === data.addressId
    );

    appAssert(
        selectedAddress,
        NOT_FOUND,
        "Address not found"
    );

    // Fetch all products in one database query.
    const products = await ProductModel.find({
        _id: {
            $in: cart.items.map((item) => item.product),
        },
    }).select(
        "title brand price salesPercentage variants status images"
    );

    // productId -> product
    const productMap = new Map(
        products.map((product) => [
            String(product._id),
            product,
        ])
    );

    let totalItems = 0;
    let subtotal = 0;

    const orderItems = cart.items.map((cartItem) => {
        const product = productMap.get(
            String(cartItem.product)
        );

        // Product must still exist and be active.
        appAssert(
            product,
            BAD_REQUEST,
            "One or more cart items are no longer available"
        );

        appAssert(
            product.status === "active",
            BAD_REQUEST,
            "One or more cart items are no longer available"
        );

        // Make sure the requested quantity is currently available in THIS line's colour and size.
        appAssert(
            getVariantStock(product, cartItem.color, cartItem.size) >= cartItem.quantity,
            BAD_REQUEST,
            `Insufficient stock for ${product.title}`
        );

        // Calculate the actual price customer should pay.
        const unitPrice = product.salesPercentage
            ? Math.round(
                product.price -
                (product.price *
                    product.salesPercentage) /
                100
            )
            : product.price;

        const itemTotal =
            unitPrice * cartItem.quantity;

        totalItems += cartItem.quantity;
        subtotal += itemTotal;

        return {
            product: cartItem.product,
            quantity: cartItem.quantity,
            color: cartItem.color,
            size: cartItem.size,
            unitPrice,
            itemTotal,
        };
    });


    // Promo

    let appliedPromoCode = "";
    let discountAmount = 0;

    if (data.promoCode) {
        const cleanCode = data.promoCode
            .trim()
            .toUpperCase();

        const promo = await PromoModel.findOne({
            code: cleanCode,
        }).select(
            "code percentage count minimumOrderValue startsAt endsAt"
        );

        appAssert(
            promo,
            NOT_FOUND,
            "Invalid promo code"
        );

        const now = new Date();

        appAssert(
            now >= promo.startsAt &&
            now <= promo.endsAt,
            BAD_REQUEST,
            "Promo code has expired or is not active"
        );

        appAssert(
            promo.count > 0,
            BAD_REQUEST,
            "Promo code limit reached"
        );

        appAssert(
            subtotal >= promo.minimumOrderValue,
            BAD_REQUEST,
            `Minimum order value for this promo code is ${promo.minimumOrderValue}`
        );

        appliedPromoCode = promo.code;

        discountAmount = Math.round(
            (subtotal * promo.percentage) / 100
        );
    }


    // Final amount customer needs to pay.

    const totalAmount = Math.max(
        0,
        subtotal - discountAmount
    );


    // Pre-generate order ID to uniquely and reliably link Razorpay receipt with MongoDB order.
    const orderId = new Types.ObjectId();

    // Create Razorpay payment order.
    const razorpayOrder = await callRazorpay("create order", () =>
        razorpay.orders.create({
            amount: toSubUnits(totalAmount),
            currency: "INR",
            receipt: `Order_${orderId}`,
        })
    );


    //  Snapshot the address.

    const deliveryAddress = [
        selectedAddress.address,
        selectedAddress.city,
        selectedAddress.state,
        selectedAddress.postalCode,
        selectedAddress.country,
    ]
        .filter(Boolean)
        .join(", ");


    // Payment is still pending at this point.

    const order = await OrderModel.create({
        _id: orderId,

        user: userId,

        customerName:
            user.name || selectedAddress.fullName,

        customerEmail:
            user.email || "",

        items: orderItems,

        totalItems,

        deliveryName:
            selectedAddress.fullName,

        deliveryAddress,

        promoCode: appliedPromoCode,

        discountAmount,

        totalAmount,

        paymentStatus: "pending",

        orderStatus: "pending_payment",

        razorpayOrderId: razorpayOrder.id,
    });

    return {
        razorpay: {
            keyId: RAZORPAY_KEY_ID,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        },

        order: {
            _id: String(order._id),
            totalItems,
            subtotal,
            discountAmount,
            totalAmount,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
        },
    };
};


export const confirmCheckoutSessionService = async (
    userId: string | Types.ObjectId,
    data: ConfirmCheckoutSessionSchema
) => {

    appAssert(
        mongoose.isValidObjectId(data.orderId),
        BAD_REQUEST,
        "Invalid order ID"
    );


    const order = await OrderModel.findOne({
        _id: data.orderId,
        user: userId,
    });

    appAssert(
        order,
        NOT_FOUND,
        "Order not found"
    );


    if (order.paymentStatus === "paid") {
        return {
            _id: String(order._id),
        };
    }

    /*
      A cancelled order can still arrive here: the customer had the payment window open in one
      tab, cancelled in another, then finished paying — and a Razorpay order can't be cancelled,
      so that payment is captured. Everything below verifies the signature and the capture before
      anything changes, so the money is real; honouring the order is the only outcome that doesn't
      leave the customer charged for nothing.
     */
    appAssert(
        order.orderStatus === "pending_payment" || order.orderStatus === "cancelled",
        BAD_REQUEST,
        "This order can no longer be paid for"
    );

    appAssert(
        order.razorpayOrderId === data.razorpay_order_id,
        BAD_REQUEST,
        "Razorpay order ID mismatch"
    );

    // Verify Razorpay signature.

    const generatedSignature = crypto
        .createHmac(
            "sha256",
            RAZORPAY_KEY_SECRET
        )
        .update(
            `${order.razorpayOrderId}|${data.razorpay_payment_id}`
        )
        .digest("hex");

    // Use timingSafeEqual instead of a normal string comparison for the signature.

    const expectedSignature =
        Buffer.from(generatedSignature, "hex");

    const receivedSignature =
        Buffer.from(
            data.razorpay_signature,
            "hex"
        );

    // For cryptographic signatures, use a timing-safe comparison rather than a normal equality comparison when practical.
    appAssert(
        expectedSignature.length ===
        receivedSignature.length &&
        crypto.timingSafeEqual(
            expectedSignature,
            receivedSignature
        ),
        BAD_REQUEST,
        "Invalid payment signature"
    );

    //  Fetch the payment directly from Razorpay.

    // A gateway failure here surfaces as a 502, which the client treats as "retry confirm" —
    // correct, since the payment itself may well have gone through.
    const payment = await callRazorpay("fetch payment", () =>
        razorpay.payments.fetch(data.razorpay_payment_id)
    );

    //  Make sure Razorpay payment belongs to the same Razorpay order.

    appAssert(
        payment.order_id ===
        order.razorpayOrderId,
        BAD_REQUEST,
        "Payment does not belong to this order"
    );

    // Make sure the payment amount matches the amount stored in our database.

    appAssert(
        payment.amount ===
        toSubUnits(order.totalAmount),
        BAD_REQUEST,
        "Payment amount mismatch"
    );

    // The order should only be fulfilled after the payment has been captured.

    appAssert(
        payment.status === "captured",
        BAD_REQUEST,
        "Payment has not been captured"
    );

    /*
      Start MongoDB transaction.
     
      Everything below is one atomic operation:
      - decrease stock
      - decrease promo usage
      - clear cart
      - mark order as paid
     */
    const session =
        await mongoose.startSession();

    try {
        await session.withTransaction(
            async () => {


                //  Decrease stock atomically.

                for (const item of order.items) {
                    const updated =
                        await ProductModel.updateOne(
                            {
                                _id: item.product,
                            },
                            {
                                $inc: {
                                    "variants.$[variant].stock": -item.quantity,
                                },
                            },
                            {
                                // Only this line's (colour, size) row, and only while it still
                                // holds enough — the filter is the oversell guard.
                                arrayFilters: [variantFilter(item)],
                                session,
                            }
                        );


                    /*
                      `modifiedCount`, NOT `matchedCount`: with arrayFilters the match is on the
                      product document, which exists whether or not any variant satisfied the
                      filter. Asserting on matchedCount would let a sold-out variant through
                      while writing nothing.
                     */
                    appAssert(
                        updated.modifiedCount > 0,
                        BAD_REQUEST,
                        "One or more products are out of stock"
                    );
                }

                if (order.promoCode) {

                    const updatedPromo =
                        await PromoModel.updateOne(
                            {
                                code: order.promoCode,
                                count: {
                                    $gt: 0,
                                },
                            },
                            {
                                $inc: {
                                    count: -1,
                                },
                            },
                            {
                                session,
                            }
                        );


                    appAssert(
                        updatedPromo.matchedCount > 0,
                        BAD_REQUEST,
                        "Promo code is no longer available"
                    );
                }

                /*
                  Remove only the lines this order actually bought, not the whole cart.
                  A payment can now be completed long after checkout (see
                  resumeCheckoutSessionService), by which time the user may have built a
                  different cart — wiping that would be silent data loss. For an ordinary
                  checkout the order's items ARE the cart, so it still ends up empty.
                  A line is identified by (product, color, size); `null` matches a field that
                  is missing, mirroring the cart's own `(a || "") === (b || "")` rule.
                 */
                for (const item of order.items) {
                    await CartModel.updateOne(
                        { user: userId },
                        {
                            $pull: {
                                items: {
                                    product: item.product,
                                    color: item.color ?? null,
                                    size: item.size ?? null,
                                },
                            },
                        },
                        {
                            session,
                        }
                    );
                }
                order.paymentStatus = "paid";
                order.orderStatus = "placed";

                order.paymentId =
                    data.razorpay_payment_id;

                order.paidAt = new Date();
                // Reviving a cancelled order (see above) — it's live again, so drop the cancel.
                order.cancelledAt = null;
                order.cancelledBy = null;
                await order.save({
                    session,
                });
            }
        );

    } finally {
        await session.endSession();
    }

    return {
        _id: String(order._id),
    };
};

/**
 * Hands back the Razorpay session for an order that was abandoned at the gateway, so it can be
 * paid without building a new order from the cart. The Razorpay order, the item snapshot, the
 * address and the amount all already exist on the stored row, and confirm works purely off that
 * row — so nothing new is created here.
 */
export const resumeCheckoutSessionService = async (
    userId: string | Types.ObjectId,
    data: ResumeCheckoutSessionSchema
) => {
    appAssert(mongoose.isValidObjectId(data.orderId), BAD_REQUEST, "Invalid order ID");

    const order = await OrderModel.findOne({ _id: data.orderId, user: userId });
    appAssert(order, NOT_FOUND, "Order not found");

    const code = String(order._id).slice(-8).toUpperCase();

    appAssert(order.paymentStatus !== "paid", CONFLICT, "This order has already been paid");
    appAssert(
        order.orderStatus === "pending_payment",
        BAD_REQUEST,
        "This order can no longer be paid for"
    );

    // If Razorpay already has this order as paid, the customer WAS charged but our confirm never
    // ran (the browser closed, the network dropped). Opening a second payment would double-charge
    // them, so refuse and point at support. Recovering it automatically means confirming
    // server-side without the client's signature, which is a separate, security-sensitive change.
    const razorpayOrder = await callRazorpay("fetch order", () =>
        razorpay.orders.fetch(order.razorpayOrderId)
    );

    appAssert(
        razorpayOrder.status !== "paid",
        CONFLICT,
        `We've already received a payment for order #${code}. Please contact support with this order number.`
    );

    // confirm only checks these AFTER the money is captured, so for an order that may be days old
    // they are verified here, before the gateway opens. Otherwise a customer could be charged for
    // something that can no longer be fulfilled.
    const products = await ProductModel.find({
        _id: { $in: order.items.map((item) => item.product) },
    }).select("title stock status");

    const productById = new Map(products.map((product) => [String(product._id), product]));

    for (const item of order.items) {
        const product = productById.get(String(item.product));

        appAssert(
            product && product.status === "active",
            BAD_REQUEST,
            "One or more items in this order are no longer available"
        );
        appAssert(
            getVariantStock(product, item.color, item.size) >= item.quantity,
            BAD_REQUEST,
            `Insufficient stock for ${product.title}`
        );
    }

    if (order.promoCode) {
        const promo = await PromoModel.findOne({ code: order.promoCode });
        const now = new Date();

        appAssert(
            promo && now >= promo.startsAt && now <= promo.endsAt && promo.count > 0,
            BAD_REQUEST,
            "The promo code used on this order is no longer available"
        );
    }

    return {
        razorpay: {
            keyId: RAZORPAY_KEY_ID,
            orderId: order.razorpayOrderId,
            // Rebuilt from the stored rupee total with the same conversion create-session used.
            amount: toSubUnits(order.totalAmount),
            currency: "INR",
        },

        order: {
            _id: String(order._id),
            totalItems: order.totalItems,
            subtotal: order.totalAmount + order.discountAmount,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
        },
    };
};

export const getUserPointsService = async (
    userId: string | Types.ObjectId
) => {
    const user = await UserModel.findById(userId).select("points").lean();
    appAssert(user, NOT_FOUND, "User not found");

    return {
        points: user.points || 0,
    };
};

export const payWithPointsService = async (
    userId: string | Types.ObjectId,
    data: PayWithPointsSchema
) => {
    appAssert(
        mongoose.isValidObjectId(data.addressId),
        BAD_REQUEST,
        "Invalid address ID"
    );

    const [user, cart] = await Promise.all([
        UserModel.findById(userId),
        CartModel.findOne({ user: userId }).select("items"),
    ]);

    appAssert(user, NOT_FOUND, "User not found");

    appAssert(
        cart && cart.items.length > 0,
        BAD_REQUEST,
        "Cart is empty"
    );

    const selectedAddress = user.address.find(
        (address: any) =>
            String(address._id) === data.addressId
    );

    appAssert(
        selectedAddress,
        NOT_FOUND,
        "Address not found"
    );

    const products = await ProductModel.find({
        _id: {
            $in: cart.items.map((item) => item.product),
        },
    }).select(
        "title brand price salesPercentage variants status images"
    );

    const productMap = new Map(
        products.map((product) => [
            String(product._id),
            product,
        ])
    );

    let totalItems = 0;
    let subtotal = 0;

    // Build order items and calculate subtotal.
    const orderItems = cart.items.map((cartItem) => {
        const product = productMap.get(
            String(cartItem.product)
        );

        appAssert(
            product,
            BAD_REQUEST,
            "One or more cart items are no longer available"
        );

        appAssert(
            product.status === "active",
            BAD_REQUEST,
            "One or more cart items are no longer available"
        );

        appAssert(
            getVariantStock(product, cartItem.color, cartItem.size) >= cartItem.quantity,
            BAD_REQUEST,
            `Insufficient stock for ${product.title}`
        );

        const unitPrice = product.salesPercentage
            ? Math.round(
                  product.price -
                      (product.price *
                          product.salesPercentage) /
                          100
              )
            : product.price;

        const itemTotal =
            unitPrice * cartItem.quantity;

        totalItems += cartItem.quantity;
        subtotal += itemTotal;

        return {
            product: cartItem.product,
            quantity: cartItem.quantity,
            color: cartItem.color,
            size: cartItem.size,
            unitPrice,
            itemTotal,
        };
    });

    // Promo calculation.
    let appliedPromoCode = "";
    let discountAmount = 0;

    if (data.promoCode) {
        const cleanCode = data.promoCode
            .trim()
            .toUpperCase();

        const promo = await PromoModel.findOne({
            code: cleanCode,
        }).select(
            "code percentage count minimumOrderValue startsAt endsAt"
        );

        appAssert(
            promo,
            NOT_FOUND,
            "Invalid promo code"
        );

        const now = new Date();

        appAssert(
            now >= promo.startsAt &&
                now <= promo.endsAt,
            BAD_REQUEST,
            "Promo code has expired or is not active"
        );

        appAssert(
            promo.count > 0,
            BAD_REQUEST,
            "Promo code limit reached"
        );

        appAssert(
            subtotal >= promo.minimumOrderValue,
            BAD_REQUEST,
            `Minimum order value for this promo code is ${promo.minimumOrderValue}`
        );

        appliedPromoCode = promo.code;

        discountAmount = Math.round(
            (subtotal * promo.percentage) / 100
        );
    }

    // Final amount that must be paid using points.
    const totalAmount = Math.max(
        0,
        subtotal - discountAmount
    );

    const session = await mongoose.startSession();

    let orderId: Types.ObjectId;
    let remainingPoints = 0;

    try {
        await session.withTransaction(async () => {
            
            const deductedUserPoints =
                await UserModel.updateOne(
                    {
                        _id: userId,
                        points: {
                            $gte: totalAmount,
                        },
                    },
                    {
                        $inc: {
                            points: -totalAmount,
                        },
                    },
                    {
                        session,
                    }
                );

            appAssert(
                deductedUserPoints.matchedCount > 0,
                BAD_REQUEST,
                "Not enough points for this order"
            );

            for (const item of orderItems) {
                const updated =
                    await ProductModel.updateOne(
                        {
                            _id: item.product,
                            status: "active",
                        },
                        {
                            $inc: {
                                "variants.$[variant].stock": -item.quantity,
                            },
                        },
                        {
                            arrayFilters: [variantFilter(item)],
                            session,
                        }
                    );

                // See the note on the other decrement: matchedCount counts the document, so the
                // guard has to be modifiedCount.
                appAssert(
                    updated.modifiedCount > 0,
                    BAD_REQUEST,
                    "One or more cart items are out of stock"
                );
            }

            if (appliedPromoCode) {
                const now = new Date();

                const updatedPromo =
                    await PromoModel.updateOne(
                        {
                            code: appliedPromoCode,
                            count: {
                                $gt: 0,
                            },
                            startsAt: {
                                $lte: now,
                            },
                            endsAt: {
                                $gte: now,
                            },
                        },
                        {
                            $inc: {
                                count: -1,
                            },
                        },
                        {
                            session,
                        }
                    );

                appAssert(
                    updatedPromo.matchedCount > 0,
                    BAD_REQUEST,
                    "Promo code is no longer available"
                );
            }

            await CartModel.updateOne(
                {
                    user: userId,
                },
                {
                    $set: {
                        items: [],
                    },
                },
                {
                    session,
                }
            );

            orderId = new Types.ObjectId();

            const pointsPaymentId =
                `points_${Date.now()}_${orderId}`;

            const deliveryAddress = [
                selectedAddress.address,
                selectedAddress.city,
                selectedAddress.state,
                selectedAddress.postalCode,
                selectedAddress.country,
            ]
                .filter(Boolean)
                .join(", ");

            const order = new OrderModel({
                _id: orderId,
                user: userId,
                customerName: user.name || selectedAddress.fullName,
                customerEmail: user.email || "",
                items: orderItems,
                totalItems,
                deliveryName: selectedAddress.fullName,
                deliveryAddress,
                promoCode: appliedPromoCode,
                discountAmount,
                totalAmount,
                paymentStatus: "paid",
                orderStatus: "placed",
                razorpayOrderId: pointsPaymentId,
                paymentId: pointsPaymentId,
                paidAt: new Date(),
            });

            await order.save({
                session,
            });

            const updatedUser =
                await UserModel.findById(userId)
                    .select("points")
                    .session(session)
                    .lean();

            remainingPoints =
                updatedUser?.points || 0;
        });

    } finally {
        await session.endSession();
    }

    return {
        _id: String(orderId!),
        totalPoints: remainingPoints,
    };
};




/*
// /checkout/create-session.
          Cart
            ↓
        Check user
            ↓
       Check address
            ↓
    Get current products
            ↓
Check product availability
            ↓
        Check stock
            ↓
    Calculate current prices
            ↓
    Calculate subtotal
            ↓
        Apply promo
            ↓
    Calculate final amount
            ↓
Create Razorpay payment order
            ↓
    Create MongoDB order
            ↓
Return payment + order information


 */