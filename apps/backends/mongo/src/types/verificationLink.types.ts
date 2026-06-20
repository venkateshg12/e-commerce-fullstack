import mongoose from "mongoose";
import { VerificationLinkType } from "../constants/verificationLinkType";

export interface VerificationLinkDocument extends mongoose.Document {
    userId : mongoose.Types.ObjectId,
    type : VerificationLinkType,
    token : String,
    expiresAt : Date,
    createdAt : Date
}