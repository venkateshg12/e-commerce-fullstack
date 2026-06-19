import mongoose from "mongoose";
import { VerificationLinkDocument } from "../types/verificationLink.types";
import { VerificationLinkType } from "../constants/verificationLinkType";

const verificationLinkSchema = new mongoose.Schema<VerificationLinkDocument>({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
    }
})

const VerificationLinkModel = mongoose.model<VerificationLinkDocument>(
    "VerificationLink",
    verificationLinkSchema,
    "verification_links"
)

export default VerificationLinkModel;