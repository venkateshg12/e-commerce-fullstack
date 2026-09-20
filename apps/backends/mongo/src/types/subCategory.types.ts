import mongoose from "mongoose";

export interface SubCategoryDocument extends mongoose.Document {
    name: string;
    category: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
