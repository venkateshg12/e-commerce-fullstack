import mongoose, { Types } from "mongoose";

export interface BannerDocument extends mongoose.Document {
    imageUrl: string;
    imagePublicId: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}