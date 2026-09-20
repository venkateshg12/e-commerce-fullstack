import mongoose from "mongoose";

export interface PromoDocument extends mongoose.Document {
    code: string;
    percentage: number;
    count: number;
    minimumOrderValue: number;
    startsAt: Date;
    endsAt: Date;
    createdAt: Date;
    updatedAt: Date;
}