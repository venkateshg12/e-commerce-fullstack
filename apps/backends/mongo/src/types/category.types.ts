import mongoose from "mongoose";

export interface CategoryDocument extends mongoose.Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
