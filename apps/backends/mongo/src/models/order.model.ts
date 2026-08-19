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
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

export const OrderModel = mongoose.model<OrderDocument>("Order", orderSchema); 