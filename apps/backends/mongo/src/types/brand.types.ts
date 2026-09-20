import mongoose from "mongoose";

export interface BrandDocument extends mongoose.Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
