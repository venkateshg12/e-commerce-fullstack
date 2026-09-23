import mongoose from "mongoose";
import { VerificationLinkDocument } from "../types/verificationLink.types";

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
    token: {
        type: String,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Expired links are useless, so Mongo's TTL monitor removes them.
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    }
})

const VerificationLinkModel = mongoose.model<VerificationLinkDocument>(
    "VerificationLink",
    verificationLinkSchema,
    "verification_links"
)

export default VerificationLinkModel;