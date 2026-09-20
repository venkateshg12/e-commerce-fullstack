import mongoose, { Schema } from "mongoose";
import { BannerDocument } from "../types/banner.types";

const bannerSchema = new mongoose.Schema<BannerDocument>(
    {
        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },

        imagePublicId: {
            type: String,
            required: true,
            trim: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const BannerModel = mongoose.model<BannerDocument>(
    "Banner",
    bannerSchema
);