import mongoose, { Schema } from "mongoose";
import { OrderDocument, OrderItemDocument } from "../types/order.types";

const orderItemSchema = new mongoose.Schema<OrderItemDocument>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        min: 1,
        required: true
    },
    color: {
        type: String,
        trim: true,
    },
    size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    itemTotal: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });



const orderSchema = new mongoose.Schema<OrderDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        customerName: {
            type: String,
            default: '',
            trim: true,
        },

        customerEmail: {
            type: String,
            required: true,
            trim: true,
        },

        items: {
            type: [orderItemSchema],
            default: [],
        },

        totalItems: {
            type: Number,
            required: true,
            min: 1,
        },

        deliveryName: {
            type: String,
            required: true,
            trim: true,
        },

        deliveryAddress: {
            type: String,
            required: true,
            trim: true,
        },

        promoCode: {
            type: String,
            default: "",
            uppercase: true,
            trim: true,
        },

        discountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },

        orderStatus: {
            type: String,
            enum: ["pending_payment", "placed", "shipped", "delivered", "returned", "cancelled"],
            default: "pending_payment",
            required: true,
        },

        razorpayOrderId: {
            type: String,
            required: true,
            unique: true,
        },

        paymentId: {
            type: String,
            default: "",
            trim: true
        },

        paidAt: {
            type: Date,
            default: null,
        },

        deliveredAt: {
            type: Date,
            default: null,
        },

        returnedAt: {
            type: Date,
            default: null,
        },

        shippedAt: {
            type: Date,
            default: null,
        },

        cancelledAt: {
            type: Date,
            default: null,
        },

        // Who cancelled it: the customer (from /orders) or an admin (from the admin panel).
        cancelledBy: {
            type: String,
            enum: ["customer", "admin", null],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

// Cancelled orders are deleted 12 hours after cancellation — Mongo's TTL monitor does it (it sweeps
// about once a minute). The partial filter is what keeps this safe: only `cancelled` orders ever
// match, and one that gets paid anyway (confirm's revive path) has cancelledAt cleared and becomes
// `placed`, so it drops out. Only unpaid orders can be cancelled, so no payment record is lost.
orderSchema.index(
    { cancelledAt: 1 },
    {
        expireAfterSeconds: 12 * 60 * 60,
        partialFilterExpression: { orderStatus: "cancelled" },
    }
);

export const OrderModel = mongoose.model<OrderDocument>("Order", orderSchema); 