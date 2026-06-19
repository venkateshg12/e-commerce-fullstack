import mongoose from "mongoose";
import { VerificationLinkType } from "../constants/verificationLinkType";

export interface VerificationLinkDocument extends mongoose.Document {
    userId : mongoose.Types.ObjectId,
    type : VerificationLinkType,
    expiresAt : Date,
    createdAt : Date
}