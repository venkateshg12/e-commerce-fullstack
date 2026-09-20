import mongoose, { Types } from "mongoose";

export interface WishlistDocument extends mongoose.Document {
    user : Types.ObjectId;
    products : Types.ObjectId[];
    createdAt : Date;
    updatedAt : Date;
}

