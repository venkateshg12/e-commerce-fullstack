import mongoose, { Schema } from "mongoose";
import { WishlistDocument } from "../types/wishlist.types";

const wishlistSchema = new mongoose.Schema<WishlistDocument>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    products: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Product',
            }
        ],
        default: []
    }
}, { timestamps: true },)

export const WishlistModel = mongoose.model("Wishlist", wishlistSchema);