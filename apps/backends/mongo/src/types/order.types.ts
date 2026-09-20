import mongoose, { Types } from "mongoose";
import { ProductSize } from "./product.types";

export type PaymentStatus = "pending" | "paid" | "failed";

export type OrderStatus = "pending_payment" | "placed" | "shipped" | "delivered" | "returned" | "cancelled";

export type CancelledBy = "customer" | "admin";

export interface OrderItemDocument extends mongoose.Document {
    product: Types.ObjectId;
    quantity: number;
    color?: string;
    size?: ProductSize;
    unitPrice: number;
    itemTotal: number;
};

export interface OrderDocument extends mongoose.Document {
    user: Types.ObjectId;
    customerName: string;
    customerEmail: string;
    items: OrderItemDocument[];
    totalItems: number;
    deliveryName: string;
    deliveryAddress: string;
    promoCode: string;
    discountAmount: number;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    razorpayOrderId: string;
    paymentId?: string;
    paidAt?: Date | null;
    deliveredAt?: Date | null;
    returnedAt?: Date | null;
    shippedAt?: Date | null;
    cancelledAt?: Date | null;
    cancelledBy?: CancelledBy | null;
    createdAt: Date;
    updatedAt: Date;
};


// A customer order line once `items.product` has been populated. `product` is null when the admin
// has since deleted the product — orders keep only the reference, not a title/image snapshot.
export type CustomerOrderItemRow = {
    product: {
        _id: Types.ObjectId;
        title: string;
        images?: Array<{ url: string; isCover?: boolean }>;
        brand?: { name: string } | null;
    } | null;
    quantity: number;
    color?: string;
    size?: ProductSize;
    unitPrice: number;
    itemTotal: number;
};

export type CustomerOrderRow = {
    _id: Types.ObjectId;
    items: CustomerOrderItemRow[];
    deliveryName: string;
    deliveryAddress: string;
    promoCode?: string;
    discountAmount: number;
    totalItems: number;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    paidAt?: Date | null;
    deliveredAt?: Date | null;
    returnedAt?: Date | null;
    shippedAt?: Date | null;
    cancelledAt?: Date | null;
    cancelledBy?: CancelledBy | null;
    createdAt: Date;
};


export type AdminOrderRow = {
    _id: Types.ObjectId;
    customerName: string;
    customerEmail: string;
    items: CustomerOrderItemRow[];
    deliveryName: string;
    deliveryAddress: string;
    promoCode?: string;
    discountAmount: number;
    paymentId?: string;
    totalItems: number;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    paidAt?: Date | null;
    deliveredAt?: Date | null;
    returnedAt?: Date | null;
    shippedAt?: Date | null;
    cancelledAt?: Date | null;
    cancelledBy?: CancelledBy | null;
    createdAt: Date;
};