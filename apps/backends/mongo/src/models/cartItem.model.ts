import mongoose, { Schema } from "mongoose";
import { CartDocument, CartItemDocument } from "../types/cartItem.types";

const cartItemSchema = new mongoose.Schema<CartItemDocument>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    color: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
    },
    // Which of the product's photos was showing when this line was added. Optional: only set
    // when the client sent one, and validated against product.images at write time.
    image: {
        type: String,
        trim: true,
    }
}, { _id: false }
);

export const CartItemModel = mongoose.model<CartItemDocument>("CartItem", cartItemSchema);


const cartSchema = new mongoose.Schema<CartDocument>({
    user : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true,
        unique : true
    },
    items : {
        type : [cartItemSchema],
        default : []
    },
},{timestamps : true})

export const CartModel = mongoose.model<CartDocument>("Cart", cartSchema);