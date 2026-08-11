import mongoose, { Types } from "mongoose";
import UserModel from "../models/user.model";
import { CartModel } from "../models/cartItem.model";
import { PromoModel } from "../models/promo.model";
import ProductModel from "../models/product.model";
import { OrderModel } from "../models/order.model";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { CreateCheckoutSessionSchema } from "@repo/types";
import { razorpay } from "../utils/razorpay";
import { toSubUnits } from "../utils/currency";
import { RAZORPAY_KEY_ID } from "../constants/env";

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
        "title brand price salePercentage stock status images"
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
            product && product.status === "active",
            BAD_REQUEST,
            "One or more cart items are no longer available"
        );

        // Make sure the requested quantity is currently available.
        appAssert(
            product.stock >= cartItem.quantity,
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

    /*
     * Final amount customer needs to pay.
     */
    const totalAmount = Math.max(
        0,
        subtotal - discountAmount
    );

    /*
     * Create Razorpay payment order.
     *
     * Razorpay expects the amount in the smallest
     * currency unit, e.g. paise for INR.
     */
    const razorpayOrder =
        await razorpay.orders.create({
            amount: toSubUnits(totalAmount),
            currency: "INR",
            receipt: `Order_${Date.now()}`,
        });

    /*
     * Snapshot the address.
     *
     * Don't depend on the user's current address later,
     * because the user may edit/delete it after placing
     * the order.
     */
    const deliveryAddress = [
        selectedAddress.address,
        selectedAddress.city,
        selectedAddress.state,
        selectedAddress.postalCode,
        selectedAddress.country,
    ]
        .filter(Boolean)
        .join(", ");

    /*
     * Create local order.
     *
     * Payment is still pending at this point.
     */
    const order = await OrderModel.create({
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