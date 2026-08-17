import mongoose from "mongoose";
import { PromoDocument } from "../types/promo.types";

const promoSchema = new mongoose.Schema<PromoDocument>({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    percentage: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
    },
    count: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    minimumOrderValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    startsAt: {
        type: Date,
        required: true,
    },
    endsAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

export const PromoModel = mongoose.model<PromoDocument>("Promo", promoSchema);