import mongoose from "mongoose";
import { BrandDocument } from "../types/brand.types";

const BrandSchema = new mongoose.Schema<BrandDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
    }
}, { timestamps: true });

// "Nike" and "nike" are the same brand.
BrandSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const BrandModel = mongoose.model<BrandDocument>("Brand", BrandSchema);
export default BrandModel;
